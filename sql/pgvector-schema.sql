create extension if not exists vector;

create table if not exists document_chunks (
  id bigserial primary key,
  notebook_id text not null,
  doc_id text not null,
  title text,
  page integer,
  chunk_id integer,
  path text not null,
  source_url text,
  content text not null,
  embedding vector(1024),
  created_at timestamptz default now()
);

create index if not exists idx_document_chunks_notebook_id on document_chunks(notebook_id);
create index if not exists idx_document_chunks_doc_id on document_chunks(doc_id);
create index if not exists idx_document_chunks_embedding_cosine
on document_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
