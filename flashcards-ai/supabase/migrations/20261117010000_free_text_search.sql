ALTER TABLE public.rag_document_chunks ALTER COLUMN embedding DROP NOT NULL;
CREATE INDEX IF NOT EXISTS rag_chunks_spanish_search_idx ON public.rag_document_chunks USING gin (to_tsvector('spanish', content));
CREATE OR REPLACE FUNCTION public.search_rag_chunks(p_query text, p_document_ids uuid[], p_match_count integer DEFAULT 8)
RETURNS TABLE(id uuid, document_id uuid, document_name text, content text, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT chunk.id, chunk.document_id, document.name, chunk.content,
    ts_rank(to_tsvector('spanish', chunk.content), plainto_tsquery('spanish', p_query))::double precision AS similarity
  FROM public.rag_document_chunks chunk
  JOIN public.rag_documents document ON document.id = chunk.document_id
  WHERE document.user_id = (SELECT auth.uid()) AND document.status = 'ready'
    AND document.id = ANY(p_document_ids)
    AND to_tsvector('spanish', chunk.content) @@ plainto_tsquery('spanish', p_query)
  ORDER BY similarity DESC, chunk.position ASC
  LIMIT LEAST(GREATEST(p_match_count, 1), 8);
$$;
REVOKE EXECUTE ON FUNCTION public.search_rag_chunks(text, uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_rag_chunks(text, uuid[], integer) TO authenticated;
