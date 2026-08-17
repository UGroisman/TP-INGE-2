-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TABLE public.flashcards (
  id           uuid DEFAULT gen_random_uuid() NOT NULL,
  study_set_id uuid DEFAULT gen_random_uuid() NOT NULL,
  question     text,
  answer       text
);

ALTER TABLE public.flashcards
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_pkey PRIMARY KEY (id);

GRANT ALL ON public.flashcards TO anon;

GRANT ALL ON public.flashcards TO authenticated;

GRANT ALL ON public.flashcards TO service_role;

CREATE TABLE public.multiple_choice_options (
  id          uuid    DEFAULT gen_random_uuid() NOT NULL,
  question_id uuid    DEFAULT gen_random_uuid() NOT NULL,
  answer      text,
  is_correct  boolean
);

ALTER TABLE public.multiple_choice_options
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.multiple_choice_options
  ADD CONSTRAINT multiple_choice_options_pkey PRIMARY KEY (id);

GRANT ALL ON public.multiple_choice_options TO anon;

GRANT ALL ON public.multiple_choice_options TO authenticated;

GRANT ALL ON public.multiple_choice_options TO service_role;

CREATE TABLE public.multiple_choice_questions (
  id           uuid DEFAULT gen_random_uuid() NOT NULL,
  study_set_id uuid DEFAULT gen_random_uuid() NOT NULL,
  question     text
);

ALTER TABLE public.multiple_choice_questions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.multiple_choice_questions
  ADD CONSTRAINT multiple_choice_questions_pkey PRIMARY KEY (id);

ALTER TABLE public.multiple_choice_options
  ADD CONSTRAINT multiple_choice_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.multiple_choice_questions(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.multiple_choice_questions TO anon;

GRANT ALL ON public.multiple_choice_questions TO authenticated;

GRANT ALL ON public.multiple_choice_questions TO service_role;

CREATE TABLE public.study_sets (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  topic      text,
  user_id    uuid                     DEFAULT gen_random_uuid()
);

CREATE POLICY "Users can create their own flashcards1" ON public.flashcards
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = flashcards.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can delete their own flashcards" ON public.flashcards
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = flashcards.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can update their own flashcards" ON public.flashcards
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = flashcards.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = flashcards.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can view their own flashcards" ON public.flashcards
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = flashcards.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can create their own multiple choice options" ON public.multiple_choice_options
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.multiple_choice_questions mcq
     JOIN public.study_sets ss ON ((ss.id = mcq.study_set_id)))
  WHERE ((mcq.id = multiple_choice_options.question_id) AND (ss.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can delete their own multiple choice options" ON public.multiple_choice_options
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.multiple_choice_questions mcq
     JOIN public.study_sets ss ON ((ss.id = mcq.study_set_id)))
  WHERE ((mcq.id = multiple_choice_options.question_id) AND (ss.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can update their own multiple choice options" ON public.multiple_choice_options
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.multiple_choice_questions mcq
     JOIN public.study_sets ss ON ((ss.id = mcq.study_set_id)))
  WHERE ((mcq.id = multiple_choice_options.question_id) AND (ss.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.multiple_choice_questions mcq
     JOIN public.study_sets ss ON ((ss.id = mcq.study_set_id)))
  WHERE ((mcq.id = multiple_choice_options.question_id) AND (ss.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can view their own multiple choice options" ON public.multiple_choice_options
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.multiple_choice_questions mcq
     JOIN public.study_sets ss ON ((ss.id = mcq.study_set_id)))
  WHERE ((mcq.id = multiple_choice_options.question_id) AND (ss.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can create their own multiple choice questions" ON public.multiple_choice_questions
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = multiple_choice_questions.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can delete their own multiple choice questions" ON public.multiple_choice_questions
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = multiple_choice_questions.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can update their own multiple choice questions" ON public.multiple_choice_questions
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = multiple_choice_questions.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = multiple_choice_questions.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can view their own multiple choice questions" ON public.multiple_choice_questions
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.study_sets
  WHERE ((study_sets.id = multiple_choice_questions.study_set_id) AND (study_sets.user_id = ( SELECT auth.uid() AS uid))))));

ALTER TABLE public.study_sets
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.study_sets
  ADD CONSTRAINT study_sets_pkey PRIMARY KEY (id);

ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_study_set_id_fkey FOREIGN KEY (study_set_id) REFERENCES public.study_sets(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.multiple_choice_questions
  ADD CONSTRAINT multiple_choice_questions_study_set_id_fkey FOREIGN KEY (study_set_id) REFERENCES public.study_sets(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.study_sets
  ADD CONSTRAINT study_sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.study_sets TO anon;

GRANT ALL ON public.study_sets TO authenticated;

GRANT ALL ON public.study_sets TO service_role;

CREATE POLICY "Users can create their own study sets" ON public.study_sets
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can create their own study sets1" ON public.study_sets
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can delete their own study sets2" ON public.study_sets
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "Users can view their own study sets" ON public.study_sets
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
