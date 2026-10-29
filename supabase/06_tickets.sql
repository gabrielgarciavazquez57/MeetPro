-- PASO 6: tickets (comprobantes de pago). Se puede correr con la app funcionando.

create table if not exists public.tickets (
  id text primary key default substr(md5(gen_random_uuid()::text), 1, 11),
  "numeroComprobante" text not null,
  monto numeric(12, 2) not null check (monto > 0),
  fecha timestamptz not null default now(),
  -- copias mínimas de quién paga y de quién cobra (ver interfaces/ticket.ts)
  profesional jsonb not null,
  usuario jsonb not null,
  estado text not null check (estado in ('aprobado', 'rechazado')),
  concepto text not null default 'Pago mensual',
  moneda text not null default 'ARS',
  "ultimosDigitos" text,
  "esPrueba" boolean not null default true
);

create unique index if not exists tickets_comprobante_uq on public.tickets ("numeroComprobante");
create index if not exists tickets_usuario_idx on public.tickets ((usuario->>'id'));
create index if not exists tickets_profesional_idx on public.tickets ((profesional->>'id'));

-- ===== Permisos =====
alter table public.tickets enable row level security;

drop policy if exists tickets_select on public.tickets;
drop policy if exists tickets_insert on public.tickets;

-- Lo ven quien pagó, quien cobró y el administrador
create policy tickets_select on public.tickets for select to authenticated
  using (usuario->>'id' = public.mi_user_id()
         or profesional->>'id' = public.mi_user_id()
         or public.soy_admin());

-- Cada usuario registra solo sus propios pagos. Los tickets no se editan ni se borran desde la app.
create policy tickets_insert on public.tickets for insert to authenticated
  with check (usuario->>'id' = public.mi_user_id());

-- ===== Limpieza al eliminar un usuario =====
create or replace function public.users_borrar_tickets() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.tickets where usuario->>'id' = old.id or profesional->>'id' = old.id;
  return old;
end $$;

drop trigger if exists users_borrar_tickets on public.users;
create trigger users_borrar_tickets after delete on public.users
  for each row execute function public.users_borrar_tickets();

notify pgrst, 'reload schema';
