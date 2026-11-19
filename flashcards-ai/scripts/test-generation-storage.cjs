/* eslint-disable @typescript-eslint/no-require-imports */
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let userId;
  try {
    const user = await admin.auth.admin.createUser({ email: `generation-test-${randomUUID()}@example.com`, password: randomUUID() + randomUUID(), email_confirm: true });
    if (user.error || !user.data.user) throw new Error('No se pudo crear el usuario temporal');
    userId = user.data.user.id;
    for (const kind of ['flashcards', 'multiple_choice']) {
      const job = await admin.from('generation_jobs').insert({ user_id: userId, topic: 'Prueba temporal', education_level: 'university', kind, request: {} }).select('id').single();
      if (job.error) throw new Error(`No se pudo crear trabajo: ${job.error.code}`);
      const items = kind === 'flashcards'
        ? [{ question: 'Pregunta temporal', answer: 'Respuesta temporal' }]
        : [{ question: 'Pregunta temporal', options: ['Uno', 'Dos', 'Tres', 'Cuatro'], correctOptionIndex: 1 }];
      const first = await admin.rpc('complete_generation_job', { p_job_id: job.data.id, p_items: items });
      if (first.error) throw new Error(`No se pudo finalizar ${kind}: ${first.error.code}`);
      const second = await admin.rpc('complete_generation_job', { p_job_id: job.data.id, p_items: items });
      if (second.error || second.data !== first.data) throw new Error(`Finalización repetida incorrecta: ${kind}`);
      const table = kind === 'flashcards' ? 'flashcards' : 'multiple_choice_questions';
      const rows = await admin.from(table).select('id', { count: 'exact' }).eq('study_set_id', first.data);
      if (rows.error || rows.count !== 1) throw new Error(`Resultado duplicado o ausente: ${kind}`);
      if (kind === 'multiple_choice') {
        const options = await admin.from('multiple_choice_options').select('answer,is_correct').eq('question_id', rows.data[0].id);
        if (options.error || options.data.length !== 4 || options.data.filter((option) => option.is_correct).map((option) => option.answer).join() !== 'Dos') throw new Error('Opciones inválidas');
      }
      console.log(`${kind}: guardado y finalización repetida verificados`);
    }
  } finally {
    if (userId) {
      const result = await admin.auth.admin.deleteUser(userId);
      if (result.error) throw new Error(`No se pudo eliminar usuario temporal ${userId}`);
      console.log('Usuario temporal eliminado');
    }
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
