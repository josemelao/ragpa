-- ============================================================
-- RAG MVP - Conversational Memory (incremental migration)
-- Execute no SQL Editor do Supabase
-- ============================================================

create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  summary    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  sources_json    jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_conversation_messages_conversation_id
  on conversation_messages(conversation_id);

create index if not exists idx_conversation_messages_created_at
  on conversation_messages(created_at);

create or replace function touch_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update conversations
    set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_updated_at on conversation_messages;
create trigger trg_touch_conversation_updated_at
after insert on conversation_messages
for each row
execute function touch_conversation_updated_at();

