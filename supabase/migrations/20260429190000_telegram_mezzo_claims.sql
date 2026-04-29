create table if not exists public.telegram_mezzo_claims (
  id bigserial primary key,
  mezzo_id text not null,
  mezzo_sigla text not null,
  chat_id text not null,
  telegram_username text,
  created_at timestamptz not null default now(),
  unique (mezzo_id, chat_id)
);

create index if not exists telegram_mezzo_claims_mezzo_idx
  on public.telegram_mezzo_claims (mezzo_id);

create index if not exists telegram_mezzo_claims_chat_idx
  on public.telegram_mezzo_claims (chat_id);

alter table public.telegram_mezzo_claims enable row level security;

drop policy if exists "telegram_mezzo_claims_select" on public.telegram_mezzo_claims;
drop policy if exists "telegram_mezzo_claims_insert" on public.telegram_mezzo_claims;
drop policy if exists "telegram_mezzo_claims_update" on public.telegram_mezzo_claims;
drop policy if exists "telegram_mezzo_claims_delete" on public.telegram_mezzo_claims;

create policy "telegram_mezzo_claims_select"
  on public.telegram_mezzo_claims
  for select
  using (true);

create policy "telegram_mezzo_claims_insert"
  on public.telegram_mezzo_claims
  for insert
  with check (true);

create policy "telegram_mezzo_claims_update"
  on public.telegram_mezzo_claims
  for update
  using (true)
  with check (true);

create policy "telegram_mezzo_claims_delete"
  on public.telegram_mezzo_claims
  for delete
  using (true);

grant select, insert, update, delete on public.telegram_mezzo_claims to anon;
grant select, insert, update, delete on public.telegram_mezzo_claims to authenticated;
grant all on public.telegram_mezzo_claims to service_role;
