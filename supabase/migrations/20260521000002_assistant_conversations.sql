create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'SalesMetrics AI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_conversations_user_id_updated_at_idx
on public.assistant_conversations (user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_conversation_id_created_at_idx
on public.assistant_messages (conversation_id, created_at asc);

create or replace function public.set_assistant_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_assistant_conversations_updated_at on public.assistant_conversations;
create trigger set_assistant_conversations_updated_at
before update on public.assistant_conversations
for each row execute function public.set_assistant_conversations_updated_at();

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

drop policy if exists "Users can read own assistant conversations" on public.assistant_conversations;
create policy "Users can read own assistant conversations"
on public.assistant_conversations for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own assistant messages" on public.assistant_messages;
create policy "Users can read own assistant messages"
on public.assistant_messages for select
to authenticated
using (auth.uid() = user_id);
