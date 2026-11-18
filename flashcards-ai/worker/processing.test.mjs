import test from "node:test";
import assert from "node:assert/strict";
import { parseStarterCards, splitMaterial, validateEmbeddings } from "./processing.mjs";

test("divide el texto con solapamiento de 150 caracteres", () => {
  const text = "a".repeat(850) + "b".repeat(150) + "c".repeat(100);
  const chunks = splitMaterial(text);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].slice(-150), chunks[1].slice(0, 150));
  assert.equal(chunks[1].slice(-100), "c".repeat(100));
});

test("acepta exactamente tres tarjetas validas y rechaza respuestas mal formadas", () => {
  const card = { question: "Pregunta", answer: "Respuesta" };
  assert.equal(parseStarterCards(JSON.stringify({ cards: [card, { ...card, question: "Otra" }, { ...card, question: "Tercera" }] })).length, 3);
  assert.throws(() => parseStarterCards(JSON.stringify({ cards: [card, card, card] })));
  assert.throws(() => parseStarterCards(JSON.stringify({ cards: [card] })));
  assert.throws(() => parseStarterCards("no es JSON"));
});

test("ordena embeddings y rechaza dimensiones o indices incorrectos", () => {
  const vector = Array(768).fill(0.5);
  assert.equal(validateEmbeddings([{ index: 1, embedding: vector }, { index: 0, embedding: vector }], 2).length, 2);
  assert.throws(() => validateEmbeddings([{ index: 0, embedding: [1] }], 1));
  assert.throws(() => validateEmbeddings([{ index: 1, embedding: vector }], 1));
});
