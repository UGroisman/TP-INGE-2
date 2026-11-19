const levels = { primary: 'primario', secondary: 'secundario', university: 'universitario' };

export function validateGenerationItems(kind, count, data) {
  const items = kind === 'flashcards' ? data?.cards : data?.questions;
  if (!Array.isArray(items) || items.length !== count) return null;
  const seen = new Set();
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
  const result = [];
  for (const item of items) {
    if (!item || !text(item.q, 500)) return null;
    const question = item.q.trim();
    const key = question.toLocaleLowerCase('es').replace(/\s+/g, ' ');
    if (seen.has(key)) return null;
    seen.add(key);
    if (kind === 'flashcards') {
      if (!text(item.a, 1000)) return null;
      result.push({ question, answer: item.a.trim() });
    } else {
      if (!Array.isArray(item.o) || item.o.length !== 4 || !item.o.every((option) => text(option, 300)) || !Number.isInteger(item.c) || item.c < 0 || item.c > 3) return null;
      const options = item.o.map((option) => option.trim());
      if (new Set(options.map((option) => option.toLocaleLowerCase('es'))).size !== 4) return null;
      result.push({ question, options, correctOptionIndex: item.c });
    }
  }
  return result;
}

export async function generateStudyItems(job, gatewayKey, fetcher = fetch) {
  if (!gatewayKey) throw new Error('Falta configurar AI_GATEWAY_API_KEY');
  const { kind, topic, education_level: level, request } = job;
  const count = kind === 'flashcards' ? 10 : request.count;
  if (!['flashcards', 'multiple_choice'].includes(kind) || !levels[level] || (kind === 'multiple_choice' && ![5, 10, 15].includes(count))) throw new Error('Trabajo inválido');
  const properties = kind === 'flashcards'
    ? { q: { type: 'string' }, a: { type: 'string' } }
    : { q: { type: 'string' }, o: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } }, c: { type: 'integer', minimum: 0, maximum: 3 } };
  const field = kind === 'flashcards' ? 'cards' : 'questions';
  const schema = { type: 'object', additionalProperties: false, properties: { [field]: { type: 'array', minItems: count, maxItems: count, items: { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) } } }, required: [field] };
  const context = typeof request.context === 'string' ? request.context : '';
  const plan = Array.isArray(request.difficultyPlan) ? request.difficultyPlan : [];
  const prompt = [`Tema: ${topic}`, `Nivel: ${levels[level]}`, `Generá exactamente ${count} ${kind === 'flashcards' ? 'flashcards con q (pregunta) y a (respuesta)' : 'preguntas con q, o (cuatro opciones) y c (índice correcto de 0 a 3)'}.`, 'Respondé en español, sin preguntas repetidas.', context ? `Usá exclusivamente este material:\n${context}` : '', plan.length ? `Dificultad por posición: ${plan.join(', ')}.` : ''].filter(Boolean).join('\n\n');
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetcher('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.AI_GATEWAY_MODEL ?? 'nvidia/nemotron-3.5-lightning-free', max_tokens: 8192, temperature: 0.1, messages: [{ role: 'system', content: `Sos un asistente educativo. Respondé solo JSON válido que cumpla este esquema: ${JSON.stringify(schema)}` }, { role: 'user', content: prompt }], response_format: { type: 'json_schema', json_schema: { name: 'study_content', strict: true, schema } } }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`AI Gateway HTTP ${response.status}`);
    const body = await response.json();
    try {
      const raw = body.choices?.[0]?.message?.content ?? '';
      const value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
      const items = validateGenerationItems(kind, count, value);
      if (items) return items;
      console.warn(`Generación inválida: tipo=${kind}, cantidad=${Array.isArray(value?.[field]) ? value[field].length : 'ausente'}, esperada=${count}`);
    } catch { /* Reintentar respuesta inválida. */ }
  }
  throw new Error('La IA no devolvió contenido válido');
}
