/* eslint-disable @typescript-eslint/no-require-imports -- This standalone smoke script runs as CommonJS. */
if (process.env.RUN_REMOTE_SMOKE !== '1') { console.error('Esta prueba crea y elimina un usuario temporal en Supabase. Configurá RUN_REMOTE_SMOKE=1 para ejecutarla.'); process.exit(1); }
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const user = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
let cookies = [];
const webUser = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => cookies, setAll: (values) => { cookies = values.map(({ name, value }) => ({ name, value })); } },
});
const email = `test-${crypto.randomUUID()}@example.com`;
const password = crypto.randomBytes(24).toString('base64url');
let testUserId;
let jobId;
let terminal = false;
async function run() {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`crear usuario: ${created.error?.message}`);
  testUserId = created.data.user.id;
  const login = await user.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`iniciar prueba: ${login.error.message}`);
  const webLogin = await webUser.auth.signInWithPassword({ email, password });
  if (webLogin.error) throw new Error(`iniciar sesión web: ${webLogin.error.message}`);
  const headers = { 'Content-Type': 'application/json', Cookie: cookies.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; ') };
  const text = 'Photosynthesis is the process by which plants convert light energy into chemical energy. Chlorophyll in chloroplasts absorbs sunlight. Plants combine water and carbon dioxide to produce glucose and release oxygen. The glucose provides energy and material for growth. This process is essential to many ecosystems.';
  const uploaded = await fetch('http://127.0.0.1:3000/api/rag/documents', { method: 'POST', headers, body: JSON.stringify({ name: 'Temporary photosynthesis smoke test', content: text }) });
  const uploadResult = await uploaded.json();
  if (!uploaded.ok || !uploadResult.document?.id) throw new Error(`subida HTTP ${uploaded.status}: ${uploadResult.error || 'sin documento'}`);
  const documentId = uploadResult.document.id;
  const job = await user.from('material_jobs').select('id').eq('document_id', documentId).single();
  if (job.error) throw new Error(`leer trabajo: ${job.error.code}`);
  jobId = job.data.id;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const current = await admin.from('material_jobs').select('status,attempts').eq('id', jobId).single();
    if (current.error) throw new Error(`leer trabajo: ${current.error.code}`);
    if (current.data.status === 'failed') { terminal = true; throw new Error(`worker falló tras ${current.data.attempts} intentos`); }
    if (current.data.status === 'ready') { terminal = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!terminal) throw new Error('tiempo agotado; se conserva el usuario temporal para evitar borrar un trabajo activo');
  const data = await user.from('rag_documents').select('status,starter_cards').eq('id', documentId).single();
  if (data.error || data.data.status !== 'ready' || data.data.starter_cards?.length !== 3) throw new Error('faltan tarjetas iniciales');
  const embedded = await user.functions.invoke('embed', { body: { texts: ['photosynthesis'] } });
  if (embedded.error) throw new Error('falló embedding autenticado');
  const matches = await user.rpc('match_gte_chunks', { p_query_embedding: embedded.data.embeddings[0], p_document_ids: [documentId], p_match_count: 8 });
  if (matches.error || !matches.data?.length) throw new Error(`búsqueda vectorial: ${matches.error?.code || 'sin resultados'}`);
  const generated = await fetch('http://127.0.0.1:3000/api/rag/flashcards', { method: 'POST', headers, body: JSON.stringify({ topic: 'photosynthesis', level: 'secondary', documentIds: [documentId] }) });
  const generationResult = await generated.json();
  if (!generated.ok || generationResult.cards?.length !== 10) throw new Error(`RAG HTTP ${generated.status}: ${generationResult.error || 'tarjetas inválidas'}`);
  const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const unauthorized = await anonymous.from('rag_documents').select('id').eq('id', documentId);
  if (!unauthorized.error && unauthorized.data?.length) throw new Error('el documento quedó accesible a anónimos');
  console.log(`OK: API de carga, cola, worker, 3 tarjetas iniciales, ${matches.data.length} fragmento vectorial, 10 tarjetas RAG y acceso anónimo restringido`);
}
run().catch((error) => { console.error('Prueba fallida:', error.message); process.exitCode = 1; }).finally(async () => {
  if (testUserId && (!jobId || terminal)) {
    const result = await admin.auth.admin.deleteUser(testUserId);
    console.log(result.error ? `No se pudo eliminar el usuario temporal: ${testUserId}` : 'Usuario y datos temporales eliminados');
    if (result.error) process.exitCode = 1;
  } else if (testUserId) console.log(`Usuario temporal conservado: ${testUserId}`);
});


