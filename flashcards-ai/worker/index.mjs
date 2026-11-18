import amqp from "amqplib";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { parseStarterCards, splitMaterial } from "./processing.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gatewayKey = process.env.AI_GATEWAY_API_KEY;
if (!url || !serviceKey || !gatewayKey) throw new Error("Faltan credenciales para el worker.");
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
await channel.assertQueue("material-processing", { durable: true });
await channel.assertQueue("material-processing.dlq", { durable: true });
await channel.prefetch(1);
console.log("Worker esperando trabajos");
ready = true;
await channel.consume("material-processing", async (message) => {
  if (!message) return;
  let jobId;
  try {
    ({ jobId } = JSON.parse(message.content.toString()));
    if (typeof jobId !== "string") throw new Error("Mensaje inválido");
    const { data: job, error } = await db.from("material_jobs").select("*").eq("id", jobId).single();
    if (error || !job) throw new Error("Trabajo inexistente");
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
    const schema = { type: "object", additionalProperties: false, properties: { cards: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } } }, required: ["cards"] };
    const aiResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.AI_GATEWAY_MODEL ?? "nvidia/nemotron-3.5-lightning-free", max_tokens: 8192, temperature: 0.1,
        messages: [{ role: "system", content: `Generá exactamente tres flashcards en español basadas exclusivamente en el texto. Devolvé solo JSON válido con este esquema: ${JSON.stringify(schema)}` }, { role: "user", content: chunks.slice(0, 4).join("\n\n").slice(0, 4000) }],
        response_format: { type: "json_schema", json_schema: { name: "starter_cards", strict: true, schema } } }),
      signal: AbortSignal.timeout(120000),
    });
    if (!aiResponse.ok) throw new Error(`Error de generacion HTTP ${aiResponse.status}`);
    const aiResult = await aiResponse.json();
    const raw = aiResult.choices?.[0]?.message?.content;
    const cards = parseStarterCards(raw);
    const done = await db.from("rag_documents").update({ status: "ready", starter_cards: cards }).eq("id", job.document_id);
    if (done.error) throw done.error;
    const saved = await db.from("material_jobs").update({ status: "ready", content: "", error: null, updated_at: new Date().toISOString() }).eq("id", jobId);
    if (saved.error) throw saved.error;
    channel.ack(message);
    console.log(`Trabajo ${jobId} listo`);
  } catch {
    const attempt = Number(message.properties.headers?.attempt ?? 0) + 1;
    console.error(`Falló trabajo ${jobId ?? "inválido"}, intento ${attempt}`);
    try {
      if (attempt < 3) {
        channel.sendToQueue("material-processing", message.content, { persistent: true, headers: { attempt } });
      } else {
        if (jobId) {
          const { data: job, error: lookupError } = await db.from("material_jobs").select("document_id").eq("id", jobId).maybeSingle();
          if (lookupError) throw lookupError;
          if (job) {
            const documentUpdate = await db.from("rag_documents").update({ status: "failed" }).eq("id", job.document_id);
            if (documentUpdate.error) throw documentUpdate.error;
            const jobUpdate = await db.from("material_jobs").update({ status: "failed", error: "Falló el procesamiento; revisá el servicio de IA.", updated_at: new Date().toISOString() }).eq("id", jobId);
            if (jobUpdate.error) throw jobUpdate.error;
          }
        }
        channel.sendToQueue("material-processing.dlq", message.content, { persistent: true, headers: { attempt } });
      }
      await channel.waitForConfirms();
      channel.ack(message);
    } catch {
      console.error(`No se pudo guardar o reenviar el trabajo ${jobId ?? "inválido"}; se devolverá a la cola`);
      channel.nack(message, false, true);
    }
  }
});
