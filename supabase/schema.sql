-- Run this SQL in your Supabase project's SQL Editor.
-- It ensures public.dayspace_workspaces exists and enforces strict
-- user-scoped Row Level Security (RLS) so authenticated users can only
-- read, insert, update, and delete their own workspace row.

create table if not exists public.dayspace_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.dayspace_workspaces enable row level security;

drop policy if exists "Users can view their own DAYSPACE workspace" on public.dayspace_workspaces;
create policy "Users can view their own DAYSPACE workspace"
  on public.dayspace_workspaces
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own DAYSPACE workspace" on public.dayspace_workspaces;
create policy "Users can insert their own DAYSPACE workspace"
  on public.dayspace_workspaces
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own DAYSPACE workspace" on public.dayspace_workspaces;
create policy "Users can update their own DAYSPACE workspace"
  on public.dayspace_workspaces
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own DAYSPACE workspace" on public.dayspace_workspaces;
create policy "Users can delete their own DAYSPACE workspace"
  on public.dayspace_workspaces
  for delete
  to authenticated
  using (auth.uid() = user_id);
