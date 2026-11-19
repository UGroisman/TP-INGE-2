/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  for (const [label, key] of [
    ['service', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['anonymous', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY],
  ]) {
    if (!url || !key) throw new Error(`Falta configuración para ${label}`);
    const client = createClient(url, key, { auth: { persistSession: false } });
    const result = await client.from('generation_jobs').select('id', { head: true, count: 'exact' });
    console.log(`${label}: tabla ${result.error ? `HTTP ${result.status}, código ${result.error.code || 'sin código'}` : 'accesible'}`);
    if (label === 'service' && result.error) process.exitCode = 1;
    if (label === 'anonymous' && (!result.error || result.status !== 401)) process.exitCode = 1;
    if (label === 'anonymous') {
      const rpc = await client.rpc('complete_generation_job', {
        p_job_id: '00000000-0000-0000-0000-000000000000', p_items: [],
      });
      console.log(`anonymous: función ${rpc.error ? `error ${rpc.error.code}` : 'accesible'}`);
      if (!rpc.error || rpc.error.code !== '42501') process.exitCode = 1;
    }
  }
}
run().catch(() => { console.error('No se pudo verificar la base.'); process.exitCode = 1; });
