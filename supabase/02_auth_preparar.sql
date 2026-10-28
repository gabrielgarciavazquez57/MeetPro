-- PASO 1 de la migración a Supabase Auth. Es aditivo: no cambia permisos ni borra nada,
-- así que se puede correr con la app actual funcionando.

-- Vínculo entre la fila de perfil y la cuenta de Auth
alter table public.users
  add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;

-- Columna que faltaba: contenido dirigido a un cliente puntual
alter table public."contenido-profesional-cliente"
  add column if not exists "dniCliente" text;

-- ===== Funciones auxiliares (las usan las políticas del paso 3) =====
create or replace function public.mi_user_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.users where auth_id = auth.uid() limit 1
$$;

create or replace function public.mi_dni() returns text
language sql stable security definer set search_path = public as $$
  select dni from public.users where auth_id = auth.uid() limit 1
$$;

create or replace function public.soy_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select "isAdmin" from public.users where auth_id = auth.uid() limit 1), false)
$$;

create or replace function public.soy_profesional_de(matricula text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profesionales p
    where p."professionalId" = matricula
      and p."profesional_userData"->>'id' = public.mi_user_id()
  )
$$;

-- Un perfil profesional es visible si su usuario existe y no es admin
create or replace function public.perfil_visible(uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select not coalesce((select coalesce("isAdmin", false) from public.users where id = uid), true)
$$;

-- Evita que la política de turnos consulte su propia tabla (daría recursión infinita)
create or replace function public.tengo_turno_con(matricula text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.turnos t
    where t."professionalId" = matricula and t.cliente->>'id' = public.mi_user_id()
  )
$$;

-- Permite iniciar sesión con username: devuelve el email de la cuenta de Auth
create or replace function public.email_de_usuario(p_username text) returns text
language sql stable security definer set search_path = public, auth as $$
  select au.email::text
  from public.users u join auth.users au on au.id = u.auth_id
  where lower(u.username) = lower(trim(p_username))
  limit 1
$$;

-- Para validar el registro sin poder leer la tabla de usuarios
create or replace function public.usuario_disponible(
  p_username text, p_dni text, p_email text, p_excluir text default null
) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'username', coalesce(p_username, '') = '' or not exists (
      select 1 from public.users
      where lower(username) = lower(trim(p_username)) and id is distinct from p_excluir),
    'dni', coalesce(p_dni, '') = '' or not exists (
      select 1 from public.users where dni = trim(p_dni) and id is distinct from p_excluir),
    'email', coalesce(p_email, '') = '' or not exists (
      select 1 from public.users
      where lower(email) = lower(trim(p_email)) and id is distinct from p_excluir)
  )
$$;

revoke all on function
  public.mi_user_id(), public.mi_dni(), public.soy_admin(), public.soy_profesional_de(text),
  public.perfil_visible(text), public.tengo_turno_con(text), public.email_de_usuario(text),
  public.usuario_disponible(text, text, text, text)
from public;
grant execute on function
  public.mi_user_id(), public.mi_dni(), public.soy_admin(), public.soy_profesional_de(text),
  public.perfil_visible(text), public.tengo_turno_con(text), public.email_de_usuario(text),
  public.usuario_disponible(text, text, text, text)
to anon, authenticated;

-- ===== Triggers sobre users =====
-- Un usuario común no puede ascenderse a admin ni cambiar su vínculo con Auth
create or replace function public.users_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and auth.role() = 'authenticated' and not public.soy_admin() then
    new."isAdmin" := old."isAdmin";
    new.auth_id := old.auth_id;
  end if;
  return new;
end $$;

drop trigger if exists users_proteger on public.users;
create trigger users_proteger before update on public.users
  for each row execute function public.users_proteger();

-- Al borrar el perfil se borra también la cuenta de Auth
create or replace function public.users_borrar_auth() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if old.auth_id is not null then
    delete from auth.users where id = old.auth_id;
  end if;
  return old;
end $$;

drop trigger if exists users_borrar_auth on public.users;
create trigger users_borrar_auth after delete on public.users
  for each row execute function public.users_borrar_auth();

notify pgrst, 'reload schema';
