export function splitMaterial(text) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const chunks = [];
  for (let position = 0; position < normalized.length; position += 850) {
    const chunk = normalized.slice(position, position + 1000).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

export function validateEmbeddings(data, count) {
  if (!Array.isArray(data) || data.length !== count) throw new Error("Cantidad de embeddings inválida");
  const sorted = [...data].sort((a, b) => a.index - b.index);
  if (sorted.some((item, index) => item.index !== index || !Array.isArray(item.embedding) || item.embedding.length !== 768 || !item.embedding.every(Number.isFinite))) {
    throw new Error("Embeddings inválidos");
  }
  return sorted.map((item) => item.embedding);
}

export function parseStarterCards(raw) {
  if (typeof raw !== "string") throw new Error("Respuesta de IA vacía");
  const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  const cards = parsed.cards;
  if (!Array.isArray(cards) || cards.length !== 3 || cards.some((card) => !card || typeof card.question !== "string" || !card.question.trim() || card.question.length > 500 || typeof card.answer !== "string" || !card.answer.trim() || card.answer.length > 1000)) throw new Error("Tarjetas iniciales inválidas");
  if (new Set(cards.map((card) => card.question.trim().toLocaleLowerCase("es"))).size !== cards.length) throw new Error("Preguntas repetidas");
  return cards.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }));
}
