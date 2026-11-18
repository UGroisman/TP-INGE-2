ALTER TABLE public.rag_document_chunks ADD COLUMN IF NOT EXISTS embedding_gte extensions.vector(384);
CREATE OR REPLACE FUNCTION public.match_gte_chunks(p_query_embedding extensions.vector(384), p_document_ids uuid[], p_match_count integer DEFAULT 8)
RETURNS TABLE(id uuid, document_id uuid, document_name text, content text, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT chunk.id, chunk.document_id, document.name, chunk.content,
    1 - (chunk.embedding_gte OPERATOR(extensions.<=>) p_query_embedding) AS similarity
  FROM public.rag_document_chunks chunk
  JOIN public.rag_documents document ON document.id = chunk.document_id
  WHERE document.user_id = (SELECT auth.uid()) AND document.status = 'ready'
    AND document.id = ANY(p_document_ids) AND chunk.embedding_gte IS NOT NULL
    AND document.embedding_model = 'supabase/gte-small'
  ORDER BY chunk.embedding_gte OPERATOR(extensions.<=>) p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 8);
$$;
REVOKE EXECUTE ON FUNCTION public.match_gte_chunks(extensions.vector, uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_gte_chunks(extensions.vector, uuid[], integer) TO authenticated;
