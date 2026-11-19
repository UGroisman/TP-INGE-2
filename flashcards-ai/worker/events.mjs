// Topología de mensajería compartida por la web (productor) y el worker
// (consumidor y suscriptor). Mantenerla en un solo archivo evita que ambos
// lados declaren colas o routing keys distintas.
import { randomUUID } from "node:crypto";

/** Exchange de tipo topic donde se publican todos los eventos de materiales. */
export const MATERIALS_EXCHANGE = "materials.events";
/** Cola de trabajo: recibe solo `material.uploaded` y la consume el worker. */
export const PROCESSING_QUEUE = "material-processing";
/** Cola de mensajes que agotaron sus reintentos. */
export const DEAD_LETTER_QUEUE = "material-processing.dlq";
/** Cola del suscriptor de auditoría: recibe todos los eventos `material.*`. */
export const AUDIT_QUEUE = "material-events.audit";
/** Límite de mensajes retenidos en la cola de auditoría si nadie la consume. */
export const AUDIT_QUEUE_MAX_LENGTH = 1000;
export const MAX_ATTEMPTS = 3;

export const EVENT_TYPES = Object.freeze({
  uploaded: "material.uploaded",
  ready: "material.ready",
  failed: "material.failed",
});

const knownTypes = new Set(Object.values(EVENT_TYPES));

/**
 * Crea un evento de material. Solo transporta identificadores: el contenido
 * del apunte queda en Supabase y nunca viaja por la cola.
 */
export function createMaterialEvent(type, { jobId, documentId }) {
  if (!knownTypes.has(type)) throw new Error(`Tipo de evento desconocido: ${type}`);
  if (typeof jobId !== "string" || !jobId) throw new Error("El evento requiere jobId");
  return {
    eventId: randomUUID(),
    type,
    jobId,
    documentId: typeof documentId === "string" ? documentId : null,
    occurredAt: new Date().toISOString(),
  };
}

/**
 * Lee el cuerpo de un mensaje. Acepta también el formato anterior
 * (`{ "jobId": "..." }`) para no perder mensajes ya encolados.
 */
export function parseMaterialEvent(content) {
  const raw = typeof content === "string" ? content : content.toString("utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || typeof parsed.jobId !== "string" || !parsed.jobId) {
    throw new Error("Mensaje inválido");
  }
  return {
    eventId: typeof parsed.eventId === "string" ? parsed.eventId : null,
    type: knownTypes.has(parsed.type) ? parsed.type : EVENT_TYPES.uploaded,
    jobId: parsed.jobId,
    documentId: typeof parsed.documentId === "string" ? parsed.documentId : null,
    occurredAt: typeof parsed.occurredAt === "string" ? parsed.occurredAt : null,
  };
}

/** Exchange, cola de trabajo y binding necesarios para publicar sin perder mensajes. */
export async function assertProcessingTopology(channel) {
  await channel.assertExchange(MATERIALS_EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(PROCESSING_QUEUE, { durable: true });
  await channel.bindQueue(PROCESSING_QUEUE, MATERIALS_EXCHANGE, EVENT_TYPES.uploaded);
}

/** Topología completa del worker: agrega DLQ y la cola del suscriptor de auditoría. */
export async function assertWorkerTopology(channel) {
  await assertProcessingTopology(channel);
  await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
  await channel.assertQueue(AUDIT_QUEUE, {
    durable: true,
    arguments: { "x-max-length": AUDIT_QUEUE_MAX_LENGTH },
  });
  await channel.bindQueue(AUDIT_QUEUE, MATERIALS_EXCHANGE, "material.#");
}

/** Publica un evento en el exchange usando su tipo como routing key. */
export function publishMaterialEvent(channel, event) {
  return channel.publish(MATERIALS_EXCHANGE, event.type, Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: "application/json",
    messageId: event.eventId,
    type: event.type,
  });
}

/** Línea de log del suscriptor de auditoría; incluye solo identificadores. */
export function describeEvent(event, routingKey) {
  const shortId = (value) => (value ? value.slice(0, 8) : "-");
  return `[auditoría] ${routingKey ?? event.type} job=${shortId(event.jobId)} documento=${shortId(event.documentId)} evento=${shortId(event.eventId)} ${event.occurredAt ?? ""}`.trim();
}
