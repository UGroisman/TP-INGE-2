import { randomUUID } from 'node:crypto';

export const GENERATION_QUEUE = 'generation-processing';
export const GENERATION_DLQ = 'generation-processing.dlq';
export const GENERATION_ROUTING_KEY = 'generation.requested';
export const EXCHANGE = 'materials.events';

export async function assertGenerationTopology(channel) {
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(GENERATION_QUEUE, { durable: true });
  await channel.assertQueue(GENERATION_DLQ, { durable: true });
  await channel.bindQueue(GENERATION_QUEUE, EXCHANGE, GENERATION_ROUTING_KEY);
}

export function publishGeneration(channel, jobId) {
  if (typeof jobId !== 'string' || !/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error('Identificador inválido');
  const eventId = randomUUID();
  channel.publish(EXCHANGE, GENERATION_ROUTING_KEY, Buffer.from(JSON.stringify({ eventId, jobId })), { persistent: true, contentType: 'application/json', messageId: eventId });
}
