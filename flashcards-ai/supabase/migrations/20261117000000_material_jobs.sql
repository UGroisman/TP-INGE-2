ALTER TABLE public.rag_documents ADD COLUMN status text NOT NULL DEFAULT 'ready' CHECK (status IN ('queued','processing','ready','failed'));
CREATE TABLE public.material_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','ready','failed')),
  attempts integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.material_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.material_jobs TO authenticated;
GRANT ALL ON public.material_jobs TO service_role;
CREATE POLICY "Users read their jobs" ON public.material_jobs FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users create their jobs" ON public.material_jobs FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.rag_documents WHERE id = document_id AND user_id = (SELECT auth.uid())));
CREATE POLICY "Users delete their jobs" ON public.material_jobs FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
