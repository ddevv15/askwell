-- Askwell Phase 1 schema (project.md §7, §9).
-- Tables, pgvector, RLS helpers, policies and grants.
-- Enum strings must match packages/shared (PLANS, WIDGET_POSITIONS, ...).
-- Limit functions (create_project, consume_message, ...) ship with their routes later.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.accounts (
  clerk_user_id text primary key,
  plan          text not null default 'free' check (plan in ('free', 'pro')),
  created_at    timestamptz not null default now()
);

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null references public.accounts (clerk_user_id) on delete cascade,
  name          text not null check (char_length(btrim(name)) > 0),
  public_key    text not null unique,
  messages_used integer not null default 0 check (messages_used >= 0),
  period_start  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index projects_owner_id_idx on public.projects (owner_id);

-- No column defaults: create_project passes DEFAULT_WIDGET_CONFIG from packages/shared,
-- so the defaults live in one place.
create table public.widget_configs (
  project_id   uuid primary key references public.projects (id) on delete cascade,
  button_color text not null check (button_color ~ '^#[0-9a-fA-F]{6}$'),
  position     text not null check (position in ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  label        text not null,
  animation    text not null check (animation in ('fade', 'slide', 'scale')),
  header_text  text not null,
  show_badge   boolean not null
);

create table public.knowledge_sources (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  type        text not null check (type in ('text', 'pdf', 'md', 'txt')),
  storage_key text unique,
  status      text not null check (status in ('uploading', 'processing', 'ready', 'failed')),
  created_at  timestamptz not null default now(),
  -- Pasted text has no file; every file has one.
  constraint knowledge_sources_storage_key_check check ((type = 'text') = (storage_key is null)),
  -- Target of knowledge_chunks' composite FK.
  constraint knowledge_sources_id_project_id_key unique (id, project_id)
);
create index knowledge_sources_project_id_idx on public.knowledge_sources (project_id);

create table public.knowledge_chunks (
  id         bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_id  uuid not null,
  content    text not null,
  embedding  extensions.vector(1536) not null,
  -- A chunk belongs to its source's project, so search scoped by project_id can't leak.
  constraint knowledge_chunks_source_id_project_id_fkey
    foreign key (source_id, project_id)
    references public.knowledge_sources (id, project_id) on delete cascade
);
create index knowledge_chunks_project_id_idx on public.knowledge_chunks (project_id);
create index knowledge_chunks_source_id_project_id_idx on public.knowledge_chunks (source_id, project_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now()
);
-- Covers the FK and the newest-first list per project.
create index conversations_project_id_created_at_idx on public.conversations (project_id, created_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role            text not null check (role in ('visitor', 'bot')),
  body            text not null,
  created_at      timestamptz not null default now()
);
-- Covers the FK and the thread in order.
create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER so policies don't recurse through RLS.
-- In `private`, which the Data API doesn't expose, so they aren't callable as RPC.
-- ---------------------------------------------------------------------------

create schema private;
revoke all on schema private from public;

create function private.owned_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.projects p
  where p.owner_id = (select auth.jwt() ->> 'sub')
$$;

create function private.owned_conversation_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.conversations c
  where c.project_id in (select private.owned_project_ids())
$$;

revoke all on function private.owned_project_ids() from public, anon, authenticated, service_role;
revoke all on function private.owned_conversation_ids() from public, anon, authenticated, service_role;
-- Policies run as the caller, so `authenticated` needs these.
grant usage on schema private to authenticated;
grant execute on function private.owned_project_ids() to authenticated;
grant execute on function private.owned_conversation_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.accounts          enable row level security;
alter table public.projects          enable row level security;
alter table public.widget_configs    enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks  enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;

create policy "Owners read their account" on public.accounts
  for select to authenticated
  using (clerk_user_id = (select auth.jwt() ->> 'sub'));

create policy "Owners read their projects" on public.projects
  for select to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'));

-- Only `name` is granted for UPDATE (column grant below).
create policy "Owners rename their projects" on public.projects
  for update to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'))
  with check (owner_id = (select auth.jwt() ->> 'sub'));

create policy "Owners delete their projects" on public.projects
  for delete to authenticated
  using (owner_id = (select auth.jwt() ->> 'sub'));

create policy "Owners read their widget configs" on public.widget_configs
  for select to authenticated
  using (project_id in (select private.owned_project_ids()));

create policy "Owners read their knowledge sources" on public.knowledge_sources
  for select to authenticated
  using (project_id in (select private.owned_project_ids()));

create policy "Owners read their knowledge chunks" on public.knowledge_chunks
  for select to authenticated
  using (project_id in (select private.owned_project_ids()));

create policy "Owners read their conversations" on public.conversations
  for select to authenticated
  using (project_id in (select private.owned_project_ids()));

create policy "Owners read their messages" on public.messages
  for select to authenticated
  using (conversation_id in (select private.owned_conversation_ids()));

-- ---------------------------------------------------------------------------
-- Grants. Supabase's default privileges give every API role ALL on new tables;
-- replace them with exactly what §7 allows.
-- ---------------------------------------------------------------------------

revoke all on table
  public.accounts, public.projects, public.widget_configs, public.knowledge_sources,
  public.knowledge_chunks, public.conversations, public.messages
  from public, anon, authenticated, service_role;
revoke all on sequence public.knowledge_chunks_id_seq from public, anon, authenticated, service_role;

-- anon: nothing.

-- authenticated: read own rows, rename and delete own projects.
grant select on table
  public.accounts, public.projects, public.widget_configs, public.knowledge_sources,
  public.knowledge_chunks, public.conversations, public.messages
  to authenticated;
grant update (name) on table public.projects to authenticated;
grant delete on table public.projects to authenticated;

-- service_role: everything except TRUNCATE (bypasses RLS; server only).
grant select, insert, update, delete, references, trigger on table
  public.accounts, public.projects, public.widget_configs, public.knowledge_sources,
  public.knowledge_chunks, public.conversations, public.messages
  to service_role;
grant usage, select on sequence public.knowledge_chunks_id_seq to service_role;
