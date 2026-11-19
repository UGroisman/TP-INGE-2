import { getAuthenticatedServerClient } from "@/features/auth/server";
import { getDifficultyPlan } from "@/features/adaptive-learning/server";
import { retrieveRagContext, validateRagFlashcardsRequest } from "@/features/rag/server";
import { isQuestionCount } from "@/features/multiple-choice/types";
import { isEducationLevel } from "@/features/study/types";
import { enqueueGeneration } from "@/lib/queue";

export async function GET() {
  const auth = await getAuthenticatedServerClient("Iniciá sesión para ver tus generaciones.");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.from("generation_jobs")
    .select("id, topic, kind, status, error, study_set_id, created_at")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false }).limit(50);
  if (error) return Response.json({ error: "No pudimos cargar tus generaciones." }, { status: 500 });
  return Response.json({ jobs: data });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedServerClient("Iniciá sesión para gestionar tus generaciones.");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("jobId" in body) || typeof body.jobId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.jobId)) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.from("generation_jobs")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", body.jobId).eq("user_id", auth.user.id).in("status", ["ready", "failed"])
    .select("id").maybeSingle();
  if (error) return Response.json({ error: "No pudimos cerrar el aviso." }, { status: 500 });
  if (!data) return Response.json({ error: "No encontramos una generación finalizada." }, { status: 404 });
  return Response.json({ dismissed: true });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedServerClient("Iniciá sesión para guardar tus generaciones.");
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("topic" in body) || typeof body.topic !== "string" || body.topic.trim().length < 3 || body.topic.trim().length > 100 || !("level" in body) || !isEducationLevel(body.level) || !("kind" in body) || (body.kind !== "flashcards" && body.kind !== "multiple_choice")) return Response.json({ error: "Tema, nivel o tipo inválido." }, { status: 400 });
  const topic = body.topic.trim();
  const level = body.level;
  if (body.kind === "multiple_choice" && (!("count" in body) || !isQuestionCount(body.count))) return Response.json({ error: "Cantidad inválida." }, { status: 400 });
  let context = "";
  if ("documentIds" in body) {
    const validation = validateRagFlashcardsRequest(body);
    if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });
    const result = await retrieveRagContext(auth.supabase, topic, validation.documentIds);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    context = result.context;
  }
  try {
    const count = body.kind === "multiple_choice" && "count" in body && isQuestionCount(body.count) ? body.count : null;
    const difficultyPlan = count ? await getDifficultyPlan(auth.supabase, topic, level, count) : [];
    const id = crypto.randomUUID();
    const { error } = await auth.supabase.from("generation_jobs").insert({ id, user_id: auth.user.id, topic, education_level: level, kind: body.kind, request: { count, context, difficultyPlan, source: "documentIds" in body ? "rag" : "standard" } });
    if (error) return Response.json({ error: "No pudimos guardar la solicitud." }, { status: 500 });
    try { await enqueueGeneration(id); } catch { console.error("No se pudo publicar la generación; el worker recuperará el trabajo pendiente."); }
    return Response.json({ jobId: id }, { status: 202 });
  } catch {
    return Response.json({ error: "No pudimos preparar la generación." }, { status: 500 });
  }
}
