/* eslint-disable @typescript-eslint/no-require-imports */
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const userClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const users = [];
async function run() {
  try {
    for (let i = 0; i < 2; i++) {
      const email = `isolation-test-${randomUUID()}@example.com`;
      const password = randomUUID() + randomUUID();
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error('No se pudo crear usuario temporal');
      users.push({ id: created.data.user.id, email, password });
    }
    const row = await admin.from('generation_jobs').insert({ user_id: users[0].id, topic: 'Prueba temporal', education_level: 'university', kind: 'flashcards', request: {} }).select('id').single();
    if (row.error) throw new Error('No se pudo crear trabajo temporal');
    const login = await userClient.auth.signInWithPassword({ email: users[1].email, password: users[1].password });
    if (login.error) throw new Error('No se pudo autenticar el segundo usuario');
    const read = await userClient.from('generation_jobs').select('id').eq('id', row.data.id);
    if (read.error || read.data.length !== 0) throw new Error('El segundo usuario pudo leer un trabajo ajeno');
    const insert = await userClient.from('generation_jobs').insert({ user_id: users[0].id, topic: 'Prueba temporal', education_level: 'university', kind: 'flashcards', request: {} });
    if (!insert.error || insert.error.code !== '42501') throw new Error('El segundo usuario pudo crear un trabajo para otra cuenta');
    console.log('Aislamiento entre usuarios verificado');
  } finally {
    for (const user of users) {
      const result = await admin.auth.admin.deleteUser(user.id);
      if (result.error) { console.error(`No se pudo eliminar usuario temporal ${user.id}`); process.exitCode = 1; }
    }
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
