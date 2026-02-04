-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  created_at timestamptz default now()
);

-- INTEGRATIONS
create type integration_platform as enum ('tg_business', 'instagram');

create table public.integrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  platform integration_platform not null,
  credentials_encrypted text, -- JSON string containing login/pass or token, encrypted
  session_data jsonb, -- For storing cookies/session state
  system_prompt text default 'You are a helpful assistant.',
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONVERSATIONS
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  integration_id uuid references public.integrations(id) on delete cascade not null,
  external_chat_id text not null, -- TG user ID or IG thread ID
  customer_name text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(integration_id, external_chat_id)
);

-- MESSAGES
create type sender_type as enum ('user', 'assistant', 'customer');

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender sender_type not null,
  content text not null,
  metadata jsonb, -- For storing external message IDs etc
  created_at timestamptz default now()
);

-- RLS POLICIES (Basic setup)
alter table public.profiles enable row level security;
alter table public.integrations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies ensuring users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can CRUD own integrations" on integrations for all using (auth.uid() = user_id);

create policy "Users can CRUD own conversations" on conversations for all using (
  exists (select 1 from integrations where id = conversations.integration_id and user_id = auth.uid())
);

create policy "Users can CRUD own messages" on messages for all using (
  exists (
    select 1 from conversations c
    join integrations i on i.id = c.integration_id
    where c.id = messages.conversation_id and i.user_id = auth.uid()
  )
);

