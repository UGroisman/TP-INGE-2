-- Trabajos durables para generaciones que deben sobrevivir a la navegación.
-- El resultado se guarda junto con el set en una sola transacción.
CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (char_length(btrim(topic)) BETWEEN 3 AND 100),
  education_level text NOT NULL CHECK (education_level IN ('primary', 'secondary', 'university')),
  kind text NOT NULL CHECK (kind IN ('flashcards', 'multiple_choice')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  request jsonb NOT NULL,
  study_set_id uuid REFERENCES public.study_sets(id) ON DELETE SET NULL,
  error text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX generation_jobs_user_created_idx ON public.generation_jobs(user_id, created_at DESC);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generation_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;
CREATE POLICY "Users can view their generation jobs" ON public.generation_jobs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Solo el worker puede finalizar trabajos. El bloqueo evita que una entrega
-- duplicada de RabbitMQ cree dos sets; cualquier error revierte todo el lote.
CREATE FUNCTION public.complete_generation_job(p_job_id uuid, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  job public.generation_jobs%ROWTYPE;
  set_id uuid;
  question_id uuid;
  item jsonb;
  option_value jsonb;
  option_index bigint;
BEGIN
  SELECT * INTO job FROM public.generation_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'generation job not found'; END IF;
  IF job.status = 'ready' THEN RETURN job.study_set_id; END IF;
  IF job.status NOT IN ('queued', 'processing') THEN RAISE EXCEPTION 'generation job is not active'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'generation result is empty';
  END IF;
  INSERT INTO public.study_sets (topic, user_id) VALUES (job.topic, job.user_id) RETURNING id INTO set_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF job.kind = 'flashcards' THEN
      INSERT INTO public.flashcards (study_set_id, question, answer)
        VALUES (set_id, item->>'question', item->>'answer');
    ELSE
      INSERT INTO public.multiple_choice_questions (study_set_id, question)
        VALUES (set_id, item->>'question') RETURNING id INTO question_id;
      FOR option_value, option_index IN SELECT value, ordinality FROM jsonb_array_elements(item->'options') WITH ORDINALITY LOOP
        INSERT INTO public.multiple_choice_options (question_id, answer, is_correct)
          VALUES (question_id, option_value #>> '{}', option_index - 1 = (item->>'correctOptionIndex')::integer);
      END LOOP;
    END IF;
  END LOOP;
  UPDATE public.generation_jobs SET status = 'ready', study_set_id = set_id,
    error = NULL, request = '{}'::jsonb, updated_at = now() WHERE id = p_job_id;
  RETURN set_id;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_generation_job(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_generation_job(uuid, jsonb) TO service_role;
