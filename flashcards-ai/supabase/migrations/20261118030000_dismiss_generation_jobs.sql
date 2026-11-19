ALTER TABLE public.generation_jobs ADD COLUMN dismissed_at timestamptz;

-- Ocultar el aviso no borra el trabajo ni el study set y solo se permite
-- cuando el trabajo terminó. El usuario no puede modificar otros campos.
GRANT UPDATE (dismissed_at) ON public.generation_jobs TO authenticated;
CREATE POLICY "Users can dismiss their finished generation jobs"
ON public.generation_jobs FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) AND status IN ('ready', 'failed'))
WITH CHECK (user_id = (SELECT auth.uid()) AND status IN ('ready', 'failed'));
