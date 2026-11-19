-- El usuario puede crear únicamente sus solicitudes; no puede modificar
-- estados ni resultados, que son responsabilidad del worker.
GRANT INSERT (id, user_id, topic, education_level, kind, request) ON public.generation_jobs TO authenticated;
CREATE POLICY "Users can submit their own generation jobs" ON public.generation_jobs
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
ALTER TABLE public.generation_jobs ADD CONSTRAINT generation_request_size
  CHECK (octet_length(request::text) <= 30000);
