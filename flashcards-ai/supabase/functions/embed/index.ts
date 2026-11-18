import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Método no permitido", { status: 405 });
  try {
    const body = await request.json();
    if (!Array.isArray(body.texts) || body.texts.length < 1 || body.texts.length > 8 ||
      !body.texts.every((text: unknown) => typeof text === "string" && text.length > 0 && text.length <= 1000)) {
      return Response.json({ error: "Se requieren entre 1 y 8 textos de hasta 1000 caracteres." }, { status: 400 });
    }
    const embeddings = [];
    for (const text of body.texts) {
      embeddings.push(Array.from(await model.run(text, { mean_pool: true, normalize: true })));
    }
    return Response.json({ embeddings });
  } catch {
    return Response.json({ error: "No se pudieron generar los vectores." }, { status: 500 });
  }
});
