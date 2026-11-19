import "server-only";
import amqp from "amqplib";
import { assertGenerationTopology, publishGeneration } from "../../worker/generation-queue.mjs";
import {
  EVENT_TYPES,
  assertProcessingTopology,
  createMaterialEvent,
  publishMaterialEvent,
} from "../../worker/events.mjs";

/**
 * Publica `material.uploaded` en el exchange `materials.events`.
 * Antes de publicar asegura exchange, cola y binding para que el mensaje no se
 * descarte aunque el worker todavía no haya arrancado.
 */
export async function enqueueMaterial(jobId: string, documentId: string) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://localhost:5672");
  try {
    const channel = await connection.createConfirmChannel();
    await assertProcessingTopology(channel);
    publishMaterialEvent(channel, createMaterialEvent(EVENT_TYPES.uploaded, { jobId, documentId }));
    await channel.waitForConfirms();
    await channel.close();
  } finally {
    await connection.close();
  }
}

export async function enqueueGeneration(jobId: string) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://localhost:5672");
  try {
    const channel = await connection.createConfirmChannel();
    await assertGenerationTopology(channel);
    publishGeneration(channel, jobId);
    await channel.waitForConfirms();
    await channel.close();
  } finally {
    await connection.close();
  }
}
