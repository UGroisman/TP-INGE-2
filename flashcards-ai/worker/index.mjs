import amqp from "amqplib";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { parseStarterCards, splitMaterial } from "./processing.mjs";
import { generateStudyItems } from "./generation.mjs";
import { assertGenerationTopology, GENERATION_QUEUE, GENERATION_DLQ, publishGeneration } from "./generation-queue.mjs";
import {
  AUDIT_QUEUE,
  DEAD_LETTER_QUEUE,
  EVENT_TYPES,
  MAX_ATTEMPTS,
  PROCESSING_QUEUE,
  assertWorkerTopology,
  createMaterialEvent,
  describeEvent,
  parseMaterialEvent,
  publishMaterialEvent,
} from "./events.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gatewayKey = process.env.AI_GATEWAY_API_KEY;
if (!url || !serviceKey) throw new Error("Faltan credenciales de Supabase para el worker.");
if (!gatewayKey) console.warn("AI_GATEWAY_API_KEY no está configurada: los materiales se indexan sin tarjetas iniciales.");

// Render (plan gratuito) exige un puerto HTTP; también sirve como health check
// y como URL para despertar el servicio cuando se duerme.
let ready = false;
if (process.env.PORT) {
  createServer((_request, response) => {
    response.writeHead(ready ? 200 : 503, { "Content-Type": "text/plain" });
    response.end(ready ? "ready" : "starting");
  }).listen(Number(process.env.PORT), "0.0.0.0");
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const connection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://localhost:5672");
connection.on("error", () => { ready = false; });
connection.on("close", () => { ready = false; process.exit(1); });
const channel = await connection.createConfirmChannel();
await assertWorkerTopology(channel);
await assertGenerationTopology(channel);
await channel.prefetch(1);

// Segundo suscriptor del exchange: recibe todos los eventos material.* por su
// propia cola. Demuestra pub/sub: el mismo evento llega a la cola de trabajo y
// a la de auditoría sin que el productor conozca a sus consumidores.
const auditChannel = await connection.createChannel();
await auditChannel.prefetch(20);
await auditChannel.consume(AUDIT_QUEUE, (message) => {
  if (!message) return;
  try {
    console.log(describeEvent(parseMaterialEvent(message.content), message.fields.routingKey));
  } catch {
    console.warn("[auditoría] mensaje ilegible descartado");
  }
  auditChannel.ack(message);
});

async function publishOutcome(type, jobId, documentId) {
  try {
    publishMaterialEvent(channel, createMaterialEvent(type, { jobId, documentId }));
    await channel.waitForConfirms();
  } catch {
    // El estado ya quedó en Supabase; perder la notificación no invalida el trabajo.
    console.error(`No se pudo publicar ${type} para el trabajo ${jobId}`);
  }
}

async function generateStarterCards(chunks) {
  if (!gatewayKey) return null;
  const schema = { type: "object", additionalProperties: false, properties: { cards: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } } }, required: ["cards"] };
  try {
    const aiResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.AI_GATEWAY_MODEL ?? "nvidia/nemotron-3.5-lightning-free", max_tokens: 8192, temperature: 0.1,
        messages: [{ role: "system", content: `Generá exactamente tres flashcards en español basadas exclusivamente en el texto. Devolvé solo JSON válido con este esquema: ${JSON.stringify(schema)}` }, { role: "user", content: chunks.slice(0, 4).join("\n\n").slice(0, 4000) }],
        response_format: { type: "json_schema", json_schema: { name: "starter_cards", strict: true, schema } } }),
      signal: AbortSignal.timeout(120000),
    });
    if (!aiResponse.ok) throw new Error(`HTTP ${aiResponse.status}`);
    const aiResult = await aiResponse.json();
    return parseStarterCards(aiResult.choices?.[0]?.message?.content);
  } catch (error) {
    // Las tarjetas iniciales son un extra: el material ya indexado sigue disponible para RAG.
    console.warn(`No se generaron tarjetas iniciales (${error instanceof Error ? error.message : "error desconocido"})`);
    return null;
  }
}

console.log(`Worker esperando trabajos en ${PROCESSING_QUEUE}`);
ready = true;
// El barrido recupera solicitudes persistidas si el productor se cae antes de
// publicar y trabajos abandonados por un worker que terminó inesperadamente.
async function recoverGenerations() {
  try {
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recovered = await db.from('generation_jobs').update({ status: 'queued', updated_at: new Date().toISOString() }).eq('status', 'processing').lt('updated_at', stale);
    if (recovered.error) throw recovered.error;
    const pending = await db.from('generation_jobs').select('id').eq('status', 'queued').order('created_at').limit(100);
    if (pending.error) throw pending.error;
    for (const job of pending.data ?? []) publishGeneration(channel, job.id);
    if (pending.data?.length) await channel.waitForConfirms();
  } catch {
    console.error('No se pudieron recuperar generaciones pendientes');
  }
}
await recoverGenerations();
setInterval(() => { void recoverGenerations(); }, 60000).unref();

await channel.consume(GENERATION_QUEUE, async (message) => {
  if (!message) return;
  let jobId;
  let job;
  try {
    jobId = JSON.parse(message.content.toString()).jobId;
    if (typeof jobId !== 'string' || !/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error('Mensaje inválido');
    const current = await db.from('generation_jobs').select('*').eq('id', jobId).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data || current.data.status !== 'queued') { channel.ack(message); return; }
    const claimed = await db.from('generation_jobs').update({ status: 'processing', attempts: current.data.attempts + 1, updated_at: new Date().toISOString(), error: null }).eq('id', jobId).eq('status', 'queued').select('*').maybeSingle();
    if (claimed.error) throw claimed.error;
    if (!claimed.data) { channel.ack(message); return; }
    job = claimed.data;
    const items = await generateStudyItems(job, gatewayKey);
    const completed = await db.rpc('complete_generation_job', { p_job_id: jobId, p_items: items });
    if (completed.error) throw completed.error;
    channel.ack(message);
    console.log(`Generación ${jobId} guardada`);
  } catch (error) {
    const reason = error instanceof Error && /^(AI Gateway HTTP \d+|La IA no devolvió contenido válido|Falta configurar AI_GATEWAY_API_KEY|Trabajo inválido)$/.test(error.message) ? error.message : "error de conexión o persistencia";
    console.error(`Falló generación ${jobId ?? 'inválida'}: ${reason}`);
    try {
      if (!jobId || !job) {
        if (!jobId) { channel.sendToQueue(GENERATION_DLQ, message.content, { persistent: true }); await channel.waitForConfirms(); channel.ack(message); }
        else channel.nack(message, false, true);
        return;
      }
      const failed = job.attempts >= MAX_ATTEMPTS;
      const saved = await db.from('generation_jobs').update({ status: failed ? 'failed' : 'queued', error: failed ? 'No pudimos generar el contenido. Intentá nuevamente.' : null, updated_at: new Date().toISOString() }).eq('id', jobId).eq('status', 'processing');
      if (saved.error) throw saved.error;
      if (failed) channel.sendToQueue(GENERATION_DLQ, message.content, { persistent: true });
      else publishGeneration(channel, jobId);
      await channel.waitForConfirms();
      channel.ack(message);
    } catch {
      console.error(`No se pudo recuperar generación ${jobId ?? 'inválida'}`);
      channel.nack(message, false, true);
    }
  }
});

await channel.consume(PROCESSING_QUEUE, async (message) => {
  if (!message) return;
  let jobId;
  let documentId = null;
  try {
    ({ jobId, documentId } = parseMaterialEvent(message.content));
    const { data: job, error } = await db.from("material_jobs").select("*").eq("id", jobId).single();
    if (error || !job) throw new Error("Trabajo inexistente");
    documentId = job.document_id;
    if (job.status === "ready") { channel.ack(message); return; }
    const started = await db.from("material_jobs").update({ status: "processing", attempts: job.attempts + 1, updated_at: new Date().toISOString() }).eq("id", jobId);
    if (started.error) throw started.error;
    const marked = await db.from("rag_documents").update({ status: "processing" }).eq("id", job.document_id);
    if (marked.error) throw marked.error;
    const chunks = splitMaterial(job.content);
    if (!chunks.length || chunks.length > 60) throw new Error("Material inválido");
    const vectors = [];
    for (let index = 0; index < chunks.length; index += 8) {
      const result = await db.functions.invoke("embed", { body: { texts: chunks.slice(index, index + 8) } });
      if (result.error || !Array.isArray(result.data?.embeddings)) throw new Error("No se pudieron generar embeddings");
      vectors.push(...result.data.embeddings);
    }
    if (vectors.length !== chunks.length || vectors.some((vector) => !Array.isArray(vector) || vector.length !== 384 || !vector.every(Number.isFinite))) throw new Error("Vectores inválidos");
    const rows = chunks.map((content, position) => ({ document_id: job.document_id, position, content, embedding_gte: vectors[position] }));
    const result = await db.from("rag_document_chunks").upsert(rows, { onConflict: "document_id,position" });
    if (result.error) throw result.error;
    const cards = await generateStarterCards(chunks);
    const done = await db.from("rag_documents").update({ status: "ready", starter_cards: cards }).eq("id", job.document_id);
    if (done.error) throw done.error;
    const saved = await db.from("material_jobs").update({ status: "ready", content: "", error: null, updated_at: new Date().toISOString() }).eq("id", jobId);
    if (saved.error) throw saved.error;
    await publishOutcome(EVENT_TYPES.ready, jobId, job.document_id);
    channel.ack(message);
    console.log(`Trabajo ${jobId} listo (${chunks.length} fragmentos${cards ? ", 3 tarjetas iniciales" : ""})`);
  } catch {
    const attempt = Number(message.properties.headers?.attempt ?? 0) + 1;
    console.error(`Falló trabajo ${jobId ?? "inválido"}, intento ${attempt}`);
    try {
      if (attempt < MAX_ATTEMPTS) {
        channel.sendToQueue(PROCESSING_QUEUE, message.content, { persistent: true, contentType: "application/json", headers: { attempt } });
      } else {
        if (jobId) {
          const { data: job, error: lookupError } = await db.from("material_jobs").select("document_id").eq("id", jobId).maybeSingle();
          if (lookupError) throw lookupError;
          if (job) {
            const documentUpdate = await db.from("rag_documents").update({ status: "failed" }).eq("id", job.document_id);
            if (documentUpdate.error) throw documentUpdate.error;
            const jobUpdate = await db.from("material_jobs").update({ status: "failed", error: "Falló el procesamiento; revisá el servicio de embeddings.", updated_at: new Date().toISOString() }).eq("id", jobId);
            if (jobUpdate.error) throw jobUpdate.error;
            documentId = job.document_id;
          }
        }
        channel.sendToQueue(DEAD_LETTER_QUEUE, message.content, { persistent: true, contentType: "application/json", headers: { attempt } });
        if (jobId) publishMaterialEvent(channel, createMaterialEvent(EVENT_TYPES.failed, { jobId, documentId }));
      }
      await channel.waitForConfirms();
      channel.ack(message);
    } catch {
      console.error(`No se pudo guardar o reenviar el trabajo ${jobId ?? "inválido"}; se devolverá a la cola`);
      channel.nack(message, false, true);
    }
  }
});
