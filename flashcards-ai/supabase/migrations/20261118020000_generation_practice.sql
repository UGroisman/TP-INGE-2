ALTER TABLE public.multiple_choice_questions ADD COLUMN generation_position integer;
ALTER TABLE public.multiple_choice_questions ADD COLUMN generation_difficulty text
  CHECK (generation_difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE public.generation_jobs ADD COLUMN source text NOT NULL DEFAULT 'standard'
  CHECK (source IN ('standard', 'rag'));

CREATE OR REPLACE FUNCTION public.complete_generation_job(p_job_id uuid, p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  job public.generation_jobs%ROWTYPE;
  set_id uuid;
  question_id uuid;
  item jsonb;
  item_index bigint;
  option_value jsonb;
  option_index bigint;
BEGIN
  SELECT * INTO job FROM public.generation_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'generation job not found'; END IF;
  IF job.status = 'ready' THEN RETURN job.study_set_id; END IF;
  IF job.status NOT IN ('queued', 'processing') THEN RAISE EXCEPTION 'generation job is not active'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'generation result is empty'; END IF;
  INSERT INTO public.study_sets (topic, user_id) VALUES (job.topic, job.user_id) RETURNING id INTO set_id;
  FOR item, item_index IN SELECT value, ordinality FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
    IF job.kind = 'flashcards' THEN
      INSERT INTO public.flashcards (study_set_id, question, answer) VALUES (set_id, item->>'question', item->>'answer');
    ELSE
      INSERT INTO public.multiple_choice_questions (study_set_id, question, generation_position, generation_difficulty)
        VALUES (set_id, item->>'question', item_index - 1, job.request->'difficultyPlan'->>(item_index::integer - 1)) RETURNING id INTO question_id;
      FOR option_value, option_index IN SELECT value, ordinality FROM jsonb_array_elements(item->'options') WITH ORDINALITY LOOP
        INSERT INTO public.multiple_choice_options (question_id, answer, is_correct)
          VALUES (question_id, option_value #>> '{}', option_index - 1 = (item->>'correctOptionIndex')::integer);
      END LOOP;
    END IF;
  END LOOP;
  UPDATE public.generation_jobs SET status = 'ready', study_set_id = set_id,
    source = CASE WHEN job.request->>'source' = 'rag' THEN 'rag' ELSE 'standard' END,
    error = NULL, request = '{}'::jsonb, updated_at = now() WHERE id = p_job_id;
  RETURN set_id;
END;
$$;
