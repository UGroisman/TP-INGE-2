CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.rag_documents (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id         uuid                     DEFAULT auth.uid() NOT NULL,
  name            text                     NOT NULL,
  embedding_model text                     NOT NULL,
  chunk_count     integer                  NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rag_documents_pkey PRIMARY KEY (id),
  CONSTRAINT rag_documents_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT rag_documents_name_length
    CHECK (char_length(btrim(name)) BETWEEN 3 AND 100),
  CONSTRAINT rag_documents_embedding_model_not_blank
    CHECK (char_length(btrim(embedding_model)) > 0),
  CONSTRAINT rag_documents_chunk_count_range
    CHECK (chunk_count BETWEEN 1 AND 60)
);

CREATE INDEX rag_documents_user_created_idx
  ON public.rag_documents (user_id, created_at DESC);

CREATE TABLE public.rag_document_chunks (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  document_id uuid                     NOT NULL,
  position    integer                  NOT NULL,
  content     text                     NOT NULL,
  embedding   extensions.vector(768)   NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rag_document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT rag_document_chunks_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES public.rag_documents(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT rag_document_chunks_document_position_key
    UNIQUE (document_id, position),
  CONSTRAINT rag_document_chunks_position_nonnegative
    CHECK (position >= 0),
  CONSTRAINT rag_document_chunks_content_not_blank
    CHECK (char_length(btrim(content)) > 0)
);

CREATE INDEX rag_document_chunks_document_id_idx
  ON public.rag_document_chunks (document_id);

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_document_chunks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rag_documents FROM anon;
REVOKE ALL ON TABLE public.rag_document_chunks FROM anon;

GRANT SELECT, INSERT, DELETE ON TABLE public.rag_documents TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.rag_document_chunks TO authenticated;
GRANT ALL ON TABLE public.rag_documents TO service_role;
GRANT ALL ON TABLE public.rag_document_chunks TO service_role;

CREATE POLICY "Users can view their own RAG documents"
ON public.rag_documents
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own RAG documents"
ON public.rag_documents
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own RAG documents"
ON public.rag_documents
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view chunks from their own RAG documents"
ON public.rag_document_chunks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rag_documents document
    WHERE document.id = rag_document_chunks.document_id
      AND document.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create chunks for their own RAG documents"
ON public.rag_document_chunks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rag_documents document
    WHERE document.id = rag_document_chunks.document_id
      AND document.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete chunks from their own RAG documents"
ON public.rag_document_chunks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rag_documents document
    WHERE document.id = rag_document_chunks.document_id
      AND document.user_id = (SELECT auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  p_query_embedding extensions.vector(768),
  p_document_ids uuid[],
  p_embedding_model text,
  p_match_threshold double precision DEFAULT 0.30,
  p_match_count integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_name text,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    chunk.id,
    chunk.document_id,
    document.name,
    chunk.content,
    1 - (chunk.embedding OPERATOR(extensions.<=>) p_query_embedding) AS similarity
  FROM public.rag_document_chunks chunk
  JOIN public.rag_documents document
    ON document.id = chunk.document_id
  WHERE document.user_id = (SELECT auth.uid())
    AND chunk.document_id = ANY(p_document_ids)
    AND document.embedding_model = p_embedding_model
    AND 1 - (chunk.embedding OPERATOR(extensions.<=>) p_query_embedding)
      >= p_match_threshold
  ORDER BY chunk.embedding OPERATOR(extensions.<=>) p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 8);
$$;

REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(
  extensions.vector,
  uuid[],
  text,
  double precision,
  integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.match_rag_chunks(
  extensions.vector,
  uuid[],
  text,
  double precision,
  integer
) TO authenticated;
