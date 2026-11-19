import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_QUEUE,
  DEAD_LETTER_QUEUE,
  EVENT_TYPES,
  MATERIALS_EXCHANGE,
  PROCESSING_QUEUE,
  assertWorkerTopology,
  createMaterialEvent,
  describeEvent,
  parseMaterialEvent,
  publishMaterialEvent,
} from "./events.mjs";

function fakeChannel() {
  const calls = [];
  const record = (name) => async (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    assertExchange: record("assertExchange"),
    assertQueue: record("assertQueue"),
    bindQueue: record("bindQueue"),
    publish: (...args) => { calls.push(["publish", ...args]); return true; },
  };
}

test("crea eventos con identificadores y sin contenido del material", () => {
  const event = createMaterialEvent(EVENT_TYPES.uploaded, { jobId: "job-1", documentId: "doc-1" });
  assert.equal(event.type, "material.uploaded");
  assert.equal(event.jobId, "job-1");
  assert.equal(event.documentId, "doc-1");
  assert.match(event.eventId, /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(event.occurredAt)));
  assert.deepEqual(Object.keys(event).sort(), ["documentId", "eventId", "jobId", "occurredAt", "type"]);
  assert.throws(() => createMaterialEvent("material.deleted", { jobId: "job-1" }));
  assert.throws(() => createMaterialEvent(EVENT_TYPES.ready, {}));
});

test("lee eventos nuevos y mensajes del formato anterior", () => {
  const event = createMaterialEvent(EVENT_TYPES.ready, { jobId: "job-2", documentId: "doc-2" });
  assert.deepEqual(parseMaterialEvent(Buffer.from(JSON.stringify(event))), event);
  const legacy = parseMaterialEvent(JSON.stringify({ jobId: "job-3" }));
  assert.equal(legacy.jobId, "job-3");
  assert.equal(legacy.type, EVENT_TYPES.uploaded);
  assert.throws(() => parseMaterialEvent("{}"));
  assert.throws(() => parseMaterialEvent("no es JSON"));
});

test("la cola de trabajo recibe solo uploaded y la auditoría todos los eventos", async () => {
  const channel = fakeChannel();
  await assertWorkerTopology(channel);
  assert.deepEqual(channel.calls.find(([name]) => name === "assertExchange"), ["assertExchange", MATERIALS_EXCHANGE, "topic", { durable: true }]);
  const bindings = channel.calls.filter(([name]) => name === "bindQueue").map(([, queue, , key]) => [queue, key]);
  assert.deepEqual(bindings, [[PROCESSING_QUEUE, "material.uploaded"], [AUDIT_QUEUE, "material.#"]]);
  const queues = channel.calls.filter(([name]) => name === "assertQueue").map(([, queue]) => queue);
  assert.deepEqual(queues, [PROCESSING_QUEUE, DEAD_LETTER_QUEUE, AUDIT_QUEUE]);
});

test("publica con el tipo como routing key y mensaje persistente", () => {
  const channel = fakeChannel();
  const event = createMaterialEvent(EVENT_TYPES.failed, { jobId: "job-4", documentId: "doc-4" });
  publishMaterialEvent(channel, event);
  const [, exchange, routingKey, body, options] = channel.calls[0];
  assert.equal(exchange, MATERIALS_EXCHANGE);
  assert.equal(routingKey, "material.failed");
  assert.deepEqual(JSON.parse(body.toString()), event);
  assert.equal(options.persistent, true);
  assert.equal(options.messageId, event.eventId);
  assert.match(describeEvent(event, routingKey), /^\[auditoría\] material\.failed job=job-4/);
});
