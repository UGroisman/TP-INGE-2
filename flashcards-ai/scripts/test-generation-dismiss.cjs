/* eslint-disable @typescript-eslint/no-require-imports */
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
let userId;
async function run() {
  try {
    const email = `dismiss-test-${randomUUID()}@example.com`, password = randomUUID() + randomUUID();
    const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (user.error || !user.data.user) throw new Error('No se pudo crear usuario');
    userId = user.data.user.id;
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error('No se pudo iniciar sesión');
    const set = await admin.from('study_sets').insert({ user_id: userId, topic: 'Prueba temporal' }).select('id').single();
    if (set.error) throw new Error('No se pudo crear set');
    const rows = await admin.from('generation_jobs').insert(['ready', 'failed', 'processing'].map((status) => ({ user_id: userId, topic: 'Prueba temporal', education_level: 'university', kind: 'flashcards', request: {}, status, study_set_id: status === 'ready' ? set.data.id : null }))).select('id,status');
    if (rows.error) throw new Error('No se pudieron crear trabajos');
    for (const row of rows.data) {
      const updated = await client.from('generation_jobs').update({ dismissed_at: new Date().toISOString() }).eq('id', row.id).select('id');
      if (updated.error || updated.data.length !== (row.status === 'processing' ? 0 : 1)) throw new Error(`Resultado incorrecto para ${row.status}`);
    }
    const blocked = await client.from('generation_jobs').update({ status: 'failed' }).eq('id', rows.data[0].id);
    if (!blocked.error) throw new Error('Se permitió modificar el estado');
    const existing = await client.from('study_sets').select('id').eq('id', set.data.id).single();
    if (existing.error) throw new Error('No se conservó el set');
    if (process.env.TEST_API === '1') {
      let cookies = [];
      const web = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => cookies, setAll: (values) => { cookies = values.map(({ name, value }) => ({ name, value })); } } });
      if ((await web.auth.signInWithPassword({ email, password })).error) throw new Error('No se pudo autenticar la API');
      const headers = { 'Content-Type': 'application/json', Cookie: cookies.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; ') };
      const pending = rows.data.find((row) => row.status === 'processing');
      const finished = await admin.from('generation_jobs').insert({ user_id: userId, topic: 'Prueba temporal', education_level: 'university', kind: 'flashcards', request: {}, status: 'ready', study_set_id: set.data.id }).select('id').single();
      if (finished.error) throw new Error('No se pudo crear aviso para la API');
      const patch = (id) => fetch('http://127.0.0.1:3000/api/generation-jobs', { method: 'PATCH', headers, body: JSON.stringify({ jobId: id }) });
      if ((await patch(pending.id)).status !== 404) throw new Error('La API permitió cerrar un trabajo en proceso');
      if (!(await patch(finished.data.id)).ok) throw new Error('La API no cerró el aviso finalizado');
      const list = await (await fetch('http://127.0.0.1:3000/api/generation-jobs', { headers })).json();
      if (list.jobs.some((job) => job.id === finished.data.id) || !list.jobs.some((job) => job.id === pending.id)) throw new Error('La lista filtrada es incorrecta');
      console.log('API: aviso cerrado y lista actualizada');
    }
    console.log('Finalizados ocultados, procesamiento protegido y set conservado');
  } finally {
    if (userId) {
      const removed = await admin.auth.admin.deleteUser(userId);
      if (removed.error) { console.error(`No se pudo eliminar usuario temporal ${userId}`); process.exitCode = 1; }
    }
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
