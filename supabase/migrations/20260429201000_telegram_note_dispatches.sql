create table if not exists public.telegram_note_dispatches (
  id bigserial primary key,
  nota_id text not null unique,
  requested_at timestamptz,
  sent_at timestamptz not null default now(),
  title text,
  body text
);

create index if not exists telegram_note_dispatches_nota_idx
  on public.telegram_note_dispatches (nota_id);

alter table public.telegram_note_dispatches enable row level security;

drop policy if exists "telegram_note_dispatches_select" on public.telegram_note_dispatches;
drop policy if exists "telegram_note_dispatches_insert" on public.telegram_note_dispatches;
drop policy if exists "telegram_note_dispatches_update" on public.telegram_note_dispatches;
drop policy if exists "telegram_note_dispatches_delete" on public.telegram_note_dispatches;

create policy "telegram_note_dispatches_select"
  on public.telegram_note_dispatches
  for select
  using (true);

create policy "telegram_note_dispatches_insert"
  on public.telegram_note_dispatches
  for insert
  with check (true);

create policy "telegram_note_dispatches_update"
  on public.telegram_note_dispatches
  for update
  using (true)
  with check (true);

create policy "telegram_note_dispatches_delete"
  on public.telegram_note_dispatches
  for delete
  using (true);

grant select, insert, update, delete on public.telegram_note_dispatches to anon;
grant select, insert, update, delete on public.telegram_note_dispatches to authenticated;
grant all on public.telegram_note_dispatches to service_role;
