-- Ejecutar en el SQL Editor de Supabase (una vez).
-- Completa la tabla public.transfers para el configurador.

alter table public.transfers
  add column if not exists es_prueba boolean default false;

alter table public.transfers
  add column if not exists vendedor text;

alter table public.transfers
  add column if not exists distribuidor_otro text;

alter table public.transfers enable row level security;

drop policy if exists "transfers_insert_anon" on public.transfers;
create policy "transfers_insert_anon"
  on public.transfers
  for insert
  to anon, authenticated
  with check (true);
