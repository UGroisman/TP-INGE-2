CREATE TABLE public.multiple_choice_attempts (
  id                      uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id                 uuid                     DEFAULT auth.uid() NOT NULL,
  question_instance_id    uuid                     NOT NULL,
  topic                   text                     NOT NULL,
  topic_key               text                     NOT NULL,
  education_level         text                     NOT NULL,
  source                  text                     NOT NULL,
  difficulty              text                     NOT NULL,
  question                text                     NOT NULL,
  selected_option_index   smallint                 NOT NULL,
  correct_option_index    smallint                 NOT NULL,
  is_correct              boolean                  GENERATED ALWAYS AS (
    selected_option_index = correct_option_index
  ) STORED,
  created_at              timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT multiple_choice_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT multiple_choice_attempts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT multiple_choice_attempts_user_question_key
    UNIQUE (user_id, question_instance_id),
  CONSTRAINT multiple_choice_attempts_topic_length
    CHECK (char_length(btrim(topic)) BETWEEN 3 AND 100),
  CONSTRAINT multiple_choice_attempts_topic_key_length
    CHECK (char_length(topic_key) BETWEEN 1 AND 100),
  CONSTRAINT multiple_choice_attempts_education_level_valid
    CHECK (education_level IN ('primary', 'secondary', 'university')),
  CONSTRAINT multiple_choice_attempts_source_valid
    CHECK (source IN ('standard', 'rag')),
  CONSTRAINT multiple_choice_attempts_difficulty_valid
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT multiple_choice_attempts_question_not_blank
    CHECK (char_length(btrim(question)) > 0),
  CONSTRAINT multiple_choice_attempts_selected_option_valid
    CHECK (selected_option_index BETWEEN 0 AND 3),
  CONSTRAINT multiple_choice_attempts_correct_option_valid
    CHECK (correct_option_index BETWEEN 0 AND 3)
);

CREATE INDEX multiple_choice_attempts_user_topic_level_created_idx
  ON public.multiple_choice_attempts (
    user_id,
    topic_key,
    education_level,
    created_at DESC
  );

ALTER TABLE public.multiple_choice_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.multiple_choice_attempts FROM PUBLIC, anon;

GRANT SELECT, INSERT ON TABLE public.multiple_choice_attempts TO authenticated;
GRANT ALL ON TABLE public.multiple_choice_attempts TO service_role;

CREATE POLICY "Users can view their own multiple choice attempts"
ON public.multiple_choice_attempts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own multiple choice attempts"
ON public.multiple_choice_attempts
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE VIEW public.multiple_choice_topic_progress
WITH (security_invoker = true)
AS
SELECT
  attempt.user_id,
  (array_agg(attempt.topic ORDER BY attempt.created_at DESC))[1] AS topic,
  attempt.topic_key,
  attempt.education_level,
  count(*) AS total_attempts,
  count(*) FILTER (WHERE attempt.is_correct) AS correct_answers,
  count(*) FILTER (WHERE NOT attempt.is_correct) AS incorrect_answers,
  CAST(count(*) FILTER (WHERE attempt.is_correct) AS double precision)
    / NULLIF(CAST(count(*) AS double precision), 0) AS mastery,
  max(attempt.created_at) AS last_answered_at
FROM public.multiple_choice_attempts attempt
WHERE attempt.user_id = (SELECT auth.uid())
GROUP BY attempt.user_id, attempt.topic_key, attempt.education_level;

REVOKE ALL ON TABLE public.multiple_choice_topic_progress FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.multiple_choice_topic_progress TO authenticated;
GRANT ALL ON TABLE public.multiple_choice_topic_progress TO service_role;
