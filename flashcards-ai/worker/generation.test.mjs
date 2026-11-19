import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGenerationItems, generateStudyItems } from './generation.mjs';

test('valida tarjetas y evita preguntas duplicadas', () => {
  assert.deepEqual(validateGenerationItems('flashcards', 1, { cards: [{ q: ' Pregunta ', a: ' Respuesta ' }] }), [{ question: 'Pregunta', answer: 'Respuesta' }]);
  assert.equal(validateGenerationItems('flashcards', 2, { cards: [{ q: 'Misma', a: 'A' }, { q: ' misma ', a: 'B' }] }), null);
});

test('rechaza opciones duplicadas o índices inválidos', () => {
  assert.equal(validateGenerationItems('multiple_choice', 1, { questions: [{ q: 'P', o: ['A', 'a', 'C', 'D'], c: 0 }] }), null);
  assert.equal(validateGenerationItems('multiple_choice', 1, { questions: [{ q: 'P', o: ['A', 'B', 'C', 'D'], c: 4 }] }), null);
});

test('reintenta salida inválida y devuelve preguntas normalizadas', async () => {
  let calls = 0;
  const fetcher = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: ++calls === 1 ? '{}' : JSON.stringify({ questions: Array.from({ length: 5 }, (_, index) => ({ q: `Pregunta ${index}`, o: ['A', 'B', 'C', 'D'], c: 1 })) }) } }] }) });
  const result = await generateStudyItems({ kind: 'multiple_choice', topic: 'Tema', education_level: 'university', request: { count: 5 } }, 'test', fetcher);
  assert.equal(calls, 2);
  assert.equal(result.length, 5);
  assert.equal(result[0].correctOptionIndex, 1);
});
