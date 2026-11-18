ALTER TABLE public.rag_documents ADD COLUMN starter_cards jsonb;
COMMENT ON COLUMN public.rag_documents.starter_cards IS 'Tarjetas iniciales generadas para la PoC; acceso restringido por RLS del documento.';
