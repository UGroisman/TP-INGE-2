import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeTopic, buildDifficultyPlan, rankTopicsForReview, getMasteryLabel } from "./algorithm";

describe("aprendizaje adaptativo", () => {
  it("agrupa mayúsculas, acentos y espacios del mismo tema", () => {
    assert.equal(normalizeTopic("  Fotosíntesis   vegetal "), normalizeTopic("fotosintesis vegetal"));
  });
  it("usa dificultad media sin suficientes respuestas", () => {
    assert.deepEqual(buildDifficultyPlan(5, { totalAttempts: 4, mastery: 0 }), Array(5).fill("medium"));
  });
  it("prioriza facilidad cuando el dominio es bajo y dificultad cuando es alto", () => {
    const weak = buildDifficultyPlan(10, { totalAttempts: 5, mastery: 0.2 });
    const strong = buildDifficultyPlan(10, { totalAttempts: 5, mastery: 0.9 });
    assert.equal(weak.filter((difficulty) => difficulty === "easy").length, 7);
    assert.equal(strong.filter((difficulty) => difficulty === "hard").length, 7);
  });
  it("prioriza menor dominio y desempata por errores, excluyendo historiales insuficientes", () => {
    const topics = [
      { name: "alto", totalAttempts: 5, mastery: 0.8, incorrectAnswers: 1 },
      { name: "empate menor", totalAttempts: 5, mastery: 0.4, incorrectAnswers: 3 },
      { name: "insuficiente", totalAttempts: 4, mastery: 0, incorrectAnswers: 4 },
      { name: "empate mayor", totalAttempts: 10, mastery: 0.4, incorrectAnswers: 6 },
      { name: "bajo", totalAttempts: 5, mastery: 0.2, incorrectAnswers: 4 },
    ];
    assert.deepEqual(rankTopicsForReview(topics).map((topic) => topic.name), ["bajo", "empate mayor", "empate menor", "alto"]);
    assert.equal(topics.length, 5);
  });
  it("clasifica los límites de dominio", () => {
    assert.equal(getMasteryLabel(0.399), "Necesita refuerzo");
    assert.equal(getMasteryLabel(0.4), "En progreso");
    assert.equal(getMasteryLabel(0.75), "En progreso");
    assert.equal(getMasteryLabel(0.751), "Dominado");
  });
});
