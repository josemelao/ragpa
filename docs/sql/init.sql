-- ============================================================
-- RAG MVP - init.sql
-- Execute no SQL Editor do Supabase
-- ============================================================

create extension if not exists vector;

create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  original_name text not null,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

-- gemini-embedding-001 with outputDimensionality=768
create table if not exists document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  chunk_index   int not null,
  content       text not null,
  embedding     vector(768),
  created_at    timestamptz not null default now()
);

create index if not exists idx_chunks_document_id
  on document_chunks(document_id);

create index if not exists idx_chunks_embedding
  on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_document_chunks(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  id            uuid,
  document_id   uuid,
  chunk_index   int,
  content       text,
  similarity    float,
  original_name text,
  filename      text
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.original_name,
    d.filename
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
