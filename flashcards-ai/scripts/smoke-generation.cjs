/* eslint-disable @typescript-eslint/no-require-imports */
if (process.env.RUN_REMOTE_SMOKE !== '1') { console.error('Configurá RUN_REMOTE_SMOKE=1 para crear y eliminar un usuario temporal.'); process.exit(1); }
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let cookies = [];
const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => cookies, setAll: (values) => { cookies = values.map(({ name, value }) => ({ name, value })); } } });
let userId;
let pending = false;
async function run() {
  const email = `generation-smoke-${randomUUID()}@example.com`;
  const password = randomUUID() + randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('No se pudo crear usuario temporal');
  userId = created.data.user.id;
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('No se pudo autenticar usuario temporal');
  const headers = { 'Content-Type': 'application/json', Cookie: cookies.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; ') };
  let documentId;
  if (process.env.TEST_RAG === '1') {
    const material = await fetch('http://127.0.0.1:3000/api/rag/documents', { method: 'POST', headers, body: JSON.stringify({ name: 'Temporary photosynthesis material', content: 'Photosynthesis is the process by which plants convert light energy into chemical energy. Chlorophyll in chloroplasts absorbs sunlight. Plants combine water and carbon dioxide to produce glucose and release oxygen. The glucose provides energy and material for growth. This process is essential to many ecosystems.' }) });
    const uploaded = await material.json();
    if (!material.ok || !uploaded.document?.id) throw new Error(`No se pudo subir material: HTTP ${material.status}`);
    documentId = uploaded.document.id;
    pending = true;
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      const doc = await admin.from('rag_documents').select('status').eq('id', documentId).single();
      if (doc.error) throw new Error('No se pudo consultar el material');
      if (doc.data.status === 'ready' || doc.data.status === 'failed') {
        pending = false;
        if (doc.data.status === 'failed') throw new Error('Falló el procesamiento del material');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (pending) throw new Error('Tiempo agotado para el material; usuario conservado');
  }
  for (const kind of ['flashcards', 'multiple_choice']) {
    const request = { topic: documentId ? 'photosynthesis' : 'Fotosíntesis', level: 'secondary', kind, count: 5, ...(documentId ? { documentIds: [documentId] } : {}) };
    const response = await fetch('http://127.0.0.1:3000/api/generation-jobs', { method: 'POST', headers, body: JSON.stringify(request) });
    const submission = await response.json();
    if (response.status !== 202 || !submission.jobId) throw new Error(`No se pudo iniciar ${kind}: HTTP ${response.status}, ${submission.error ?? 'sin identificador'}`);
    pending = true;
    let job;
    const deadline = Date.now() + 420000;
    while (Date.now() < deadline) {
      const current = await admin.from('generation_jobs').select('status,study_set_id,attempts').eq('id', submission.jobId).single();
      if (current.error) throw new Error(`No se pudo leer ${kind}`);
      job = current.data;
      if (job.status === 'ready' || job.status === 'failed') { pending = false; break; }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (pending) throw new Error(`Tiempo agotado para ${kind}; usuario conservado por trabajo activo`);
    if (job.status !== 'ready' || !job.study_set_id) throw new Error(`${kind} falló tras ${job.attempts} intentos`);
    const detail = await fetch(`http://127.0.0.1:3000/api/study-sets/${job.study_set_id}`, { headers });
    const result = await detail.json();
    const count = kind === 'flashcards' ? result.studySet?.flashcards?.length : result.studySet?.multipleChoiceQuestions?.length;
    if (!detail.ok || count !== (kind === 'flashcards' ? 10 : 5)) throw new Error(`Contenido incompleto: ${kind}`);
    if (kind === 'multiple_choice') {
      const question = result.studySet.multipleChoiceQuestions[0];
      const correct = question.options.findIndex((option) => option.isCorrect);
      if (correct < 0 || !result.studySet.generation) throw new Error('Faltan datos para practicar');
      const attempt = await fetch('http://127.0.0.1:3000/api/multiple-choice/attempts', { method: 'POST', headers, body: JSON.stringify({ questionId: randomUUID(), topic: request.topic, level: request.level, source: documentId ? 'rag' : 'standard', difficulty: question.difficulty, question: question.question, selectedOptionIndex: correct, correctOptionIndex: correct }) });
      if (!attempt.ok) throw new Error(`No se pudo registrar respuesta: HTTP ${attempt.status}`);
      console.log('Respuesta de práctica registrada');
    }
    console.log(`${kind}: generado y recuperado por API (${count} elementos)`);
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (userId && !pending) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) { console.error(`No se pudo eliminar usuario temporal ${userId}`); process.exitCode = 1; }
    else console.log('Usuario temporal eliminado');
  } else if (userId) console.log(`Usuario temporal conservado: ${userId}`);
});
