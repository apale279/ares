-- Stato condiviso dell’app Ares (un solo “workspace” online).
-- Esegui in Supabase → SQL Editor → Run (una volta).

create table if not exists public.ares_state (
  id text primary key default 'default',
  payload jsonb not null default '{"version":0,"state":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.ares_state is 'Snapshot JSON dello store Ares (eventi, missioni, mezzi, …).';

alter table public.ares_state enable row level security;

drop policy if exists "ares_state_select" on public.ares_state;
drop policy if exists "ares_state_insert" on public.ares_state;
drop policy if exists "ares_state_update" on public.ares_state;
drop policy if exists "ares_state_delete" on public.ares_state;

-- MVP: chiunque abbia la anon key può leggere/scrivere (uso interno).
-- Per uso pubblico conviene Supabase Auth e policy per utente/team.
create policy "ares_state_select" on public.ares_state for select using (true);
create policy "ares_state_insert" on public.ares_state for insert with check (true);
create policy "ares_state_update" on public.ares_state for update using (true) with check (true);
create policy "ares_state_delete" on public.ares_state for delete using (true);

grant select, insert, update, delete on table public.ares_state to anon;
grant select, insert, update, delete on table public.ares_state to authenticated;
grant all on table public.ares_state to service_role;

-- Realtime (solo se non è già nella publication)
do $pub$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ares_state'
  ) then
    alter publication supabase_realtime add table public.ares_state;
  end if;
end
$pub$;
