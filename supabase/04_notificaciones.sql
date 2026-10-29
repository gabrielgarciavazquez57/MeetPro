-- PASO 4: notificaciones dentro de la app y consultas online.
-- Se puede correr con la app funcionando: solo agrega tablas, funciones y disparadores.

-- ===== Tablas =====
create table if not exists public.notificaciones (
  id text primary key default substr(md5(gen_random_uuid()::text), 1, 11),
  user_id text not null,
  tipo text not null,
  titulo text not null,
  mensaje text,
  enlace text,
  leida boolean not null default false,
  creada timestamptz not null default now(),
  ref text
);

-- "ref" evita duplicar avisos que se generan más de una vez (por ejemplo los recordatorios)
create unique index if not exists notificaciones_ref_uq
  on public.notificaciones (user_id, ref) where ref is not null;
create index if not exists notificaciones_user_idx
  on public.notificaciones (user_id, creada desc);

create table if not exists public.consultas (
  id text primary key default substr(md5(gen_random_uuid()::text), 1, 11),
  "professionalId" text not null,
  "userId" text not null,
  nombre text,
  apellido text,
  email text,
  titulo text not null,
  descripcion text,
  respuesta text,
  "fechaRespuesta" timestamptz,
  creada timestamptz not null default now()
);
create index if not exists consultas_prof_idx on public.consultas ("professionalId");
create index if not exists consultas_user_idx on public.consultas ("userId");

-- ===== Permisos =====
alter table public.notificaciones enable row level security;
alter table public.consultas enable row level security;

drop policy if exists notif_select on public.notificaciones;
drop policy if exists notif_update on public.notificaciones;
drop policy if exists notif_delete on public.notificaciones;
-- Las notificaciones solo las crean los disparadores: nadie inserta desde la app
create policy notif_select on public.notificaciones for select to authenticated
  using (user_id = public.mi_user_id());
create policy notif_update on public.notificaciones for update to authenticated
  using (user_id = public.mi_user_id()) with check (user_id = public.mi_user_id());
create policy notif_delete on public.notificaciones for delete to authenticated
  using (user_id = public.mi_user_id());

drop policy if exists cons_select on public.consultas;
drop policy if exists cons_insert on public.consultas;
drop policy if exists cons_update on public.consultas;
drop policy if exists cons_delete on public.consultas;
create policy cons_select on public.consultas for select to authenticated
  using ("userId" = public.mi_user_id() or public.soy_profesional_de("professionalId") or public.soy_admin());
create policy cons_insert on public.consultas for insert to authenticated
  with check ("userId" = public.mi_user_id());
create policy cons_update on public.consultas for update to authenticated
  using (public.soy_profesional_de("professionalId"))
  with check (public.soy_profesional_de("professionalId"));
create policy cons_delete on public.consultas for delete to authenticated
  using ("userId" = public.mi_user_id() or public.soy_admin());

-- ===== Funciones auxiliares (internas) =====
create or replace function public.user_de_profesional(matricula text) returns text
language sql stable security definer set search_path = public as $$
  select "profesional_userData"->>'id' from public.profesionales
  where "professionalId" = matricula limit 1
$$;

create or replace function public.nombre_de_profesional(matricula text) returns text
language sql stable security definer set search_path = public as $$
  select trim(coalesce("profesional_userData"->>'name', '') || ' ' || coalesce("profesional_userData"->>'lastname', ''))
  from public.profesionales where "professionalId" = matricula limit 1
$$;

create or replace function public.notificar(
  p_user text, p_tipo text, p_titulo text, p_mensaje text, p_enlace text, p_ref text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = '' then
    return;
  end if;
  insert into public.notificaciones (user_id, tipo, titulo, mensaje, enlace, ref)
  values (p_user, p_tipo, p_titulo, p_mensaje, p_enlace, p_ref)
  on conflict (user_id, ref) where ref is not null do nothing;
end $$;

revoke all on function public.user_de_profesional(text), public.nombre_de_profesional(text),
  public.notificar(text, text, text, text, text, text) from public, anon, authenticated;

-- ===== Turnos: reserva y cambios de estado =====
create or replace function public.turnos_notificar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pro_user text := public.user_de_profesional(new."professionalId");
  pro_nombre text := public.nombre_de_profesional(new."professionalId");
  cli jsonb := coalesce(new.cliente, old.cliente);
  cli_id text := cli->>'id';
  cli_nombre text := trim(coalesce(cli->>'name', '') || ' ' || coalesce(cli->>'lastname', ''));
  cuando text := to_char(new.fecha::date, 'DD/MM/YYYY') || ' a las ' || new.hora;
  enlace_cli text := '/turnos-existentes/' || coalesce(cli_id, '');
  enlace_pro text := '/agenda/' || new."professionalId";
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  -- Un cliente reserva un horario libre
  if old.estado = 'disponible' and new.estado = 'pendiente' then
    perform public.notificar(cli_id, 'turno_reserva', 'Reservaste un turno',
      'Tu solicitud con ' || pro_nombre || ' para el ' || cuando || ' quedó pendiente de confirmación.', enlace_cli);
    perform public.notificar(pro_user, 'turno_solicitud', 'Nueva solicitud de turno',
      cli_nombre || ' pidió un turno para el ' || cuando || '.', enlace_pro);
    return new;
  end if;

  -- El cliente cancela
  if new.estado = 'cancelado' and new."canceladoPor" = 'cliente' then
    perform public.notificar(pro_user, 'turno_estado', 'Turno cancelado por el cliente',
      cli_nombre || ' canceló el turno del ' || cuando
        || coalesce('. Motivo: ' || nullif(new."motivoCancelacion", ''), '.'), enlace_pro);
    return new;
  end if;

  -- El profesional confirma, rechaza, cancela o cierra el turno
  if new.estado in ('confirmado', 'rechazado', 'cancelado', 'completado', 'ausente') then
    perform public.notificar(cli_id, 'turno_estado',
      case new.estado
        when 'confirmado' then 'Turno confirmado'
        when 'rechazado' then 'Turno rechazado'
        when 'cancelado' then 'Turno cancelado por el profesional'
        when 'completado' then 'Turno realizado'
        else 'Turno marcado como ausente' end,
      'Tu turno con ' || pro_nombre || ' del ' || cuando
        || case new.estado
             when 'confirmado' then ' fue confirmado.'
             when 'rechazado' then ' fue rechazado' || coalesce('. Motivo: ' || nullif(new."motivoCancelacion", ''), '.')
             when 'cancelado' then ' fue cancelado' || coalesce('. Motivo: ' || nullif(new."motivoCancelacion", ''), '.')
             when 'completado' then ' figura como realizado.'
             else ' figura como ausente.' end,
      enlace_cli);

    if new.estado = 'confirmado' and coalesce(new."notaProfesional", '') <> '' then
      perform public.notificar(cli_id, 'mensaje', 'Mensaje de ' || pro_nombre, new."notaProfesional", enlace_cli);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists turnos_notificar on public.turnos;
create trigger turnos_notificar after update of estado on public.turnos
  for each row execute function public.turnos_notificar();

-- ===== Valoraciones =====
create or replace function public.valoraciones_notificar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notificar(
    public.user_de_profesional(new."professionalId"), 'valoracion', 'Nueva valoración',
    trim(coalesce(new.nombre, '') || ' ' || coalesce(new.apellido, '')) || ' te valoró con ' || new.puntaje || ' de 5'
      || case when coalesce(new.descripcion, '') <> '' then ': "' || left(new.descripcion, 140) || '"' else '.' end,
    '/valoraciones/' || new."professionalId");
  return new;
end $$;

drop trigger if exists valoraciones_notificar on public.valoraciones;
create trigger valoraciones_notificar after insert on public.valoraciones
  for each row execute function public.valoraciones_notificar();

-- ===== Consultas online =====
create or replace function public.consultas_notificar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notificar(
      public.user_de_profesional(new."professionalId"), 'consulta',
      'Nueva consulta de ' || trim(coalesce(new.nombre, '') || ' ' || coalesce(new.apellido, '')),
      new.titulo, '/consultas');
  elsif coalesce(new.respuesta, '') <> '' and new.respuesta is distinct from old.respuesta then
    perform public.notificar(
      new."userId", 'mensaje',
      'Respuesta de ' || public.nombre_de_profesional(new."professionalId"),
      left(new.respuesta, 200), '/consultas');
  end if;
  return new;
end $$;

drop trigger if exists consultas_notificar on public.consultas;
create trigger consultas_notificar after insert or update on public.consultas
  for each row execute function public.consultas_notificar();

-- ===== Contenido cliente - profesional =====
create or replace function public.contenido_notificar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  destino text;
  pro_nombre text := public.nombre_de_profesional(new."professionalId");
  ruta text := '/contenido-cliente-profesional/' || new."professionalId";
begin
  if new.tipo = 'cliente' then
    -- Lo subió un cliente: se avisa al profesional
    perform public.notificar(public.user_de_profesional(new."professionalId"), 'contenido',
      'Un cliente subió contenido', new.titulo, ruta);
  elsif coalesce(new."dniCliente", '') <> '' then
    -- Lo subió el profesional para un cliente puntual
    for destino in select id from public.users where dni = new."dniCliente" loop
      perform public.notificar(destino, 'contenido', pro_nombre || ' subió contenido para vos', new.titulo, ruta);
    end loop;
  else
    -- Contenido abierto: se avisa a los clientes que tienen o tuvieron turnos con el profesional
    for destino in
      select distinct cliente->>'id' from public.turnos
      where "professionalId" = new."professionalId" and cliente is not null
    loop
      perform public.notificar(destino, 'contenido', pro_nombre || ' subió contenido', new.titulo, ruta);
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists contenido_notificar on public."contenido-profesional-cliente";
create trigger contenido_notificar after insert on public."contenido-profesional-cliente"
  for each row execute function public.contenido_notificar();

-- ===== Recordatorios de turnos cercanos (próximas 24 horas) =====
-- La app la llama al abrirse y cada minuto; solo crea avisos para el usuario que la invoca.
create or replace function public.generar_recordatorios() returns void
language plpgsql security definer set search_path = public as $$
declare
  yo text := public.mi_user_id();
  t record;
  cuando text;
begin
  if yo is null then
    return;
  end if;

  for t in
    select * from public.turnos
    where estado = 'confirmado'
      and ((fecha || ' ' || hora)::timestamp at time zone 'America/Argentina/Buenos_Aires')
          between now() and now() + interval '24 hours'
      and (cliente->>'id' = yo or public.soy_profesional_de("professionalId"))
  loop
    cuando := to_char(t.fecha::date, 'DD/MM/YYYY') || ' a las ' || t.hora;
    if t.cliente->>'id' = yo then
      perform public.notificar(yo, 'turno_cercano', 'Tenés un turno próximo',
        'Con ' || public.nombre_de_profesional(t."professionalId") || ' el ' || cuando || '.',
        '/turnos-existentes/' || yo, 'rec:' || t.id || ':' || yo);
    else
      perform public.notificar(yo, 'turno_cercano', 'Tenés un turno próximo',
        'Con ' || trim(coalesce(t.cliente->>'name', '') || ' ' || coalesce(t.cliente->>'lastname', ''))
          || ' el ' || cuando || '.',
        '/agenda/' || t."professionalId", 'rec:' || t.id || ':' || yo);
    end if;
  end loop;
end $$;

create or replace function public.marcar_todas_leidas() returns void
language sql security definer set search_path = public as $$
  update public.notificaciones set leida = true where user_id = public.mi_user_id() and not leida
$$;

revoke all on function public.generar_recordatorios(), public.marcar_todas_leidas() from public, anon;
grant execute on function public.generar_recordatorios(), public.marcar_todas_leidas() to authenticated;

-- ===== Limpieza al eliminar usuarios o perfiles profesionales =====
create or replace function public.users_borrar_notificaciones() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.notificaciones where user_id = old.id;
  delete from public.consultas where "userId" = old.id;
  return old;
end $$;

drop trigger if exists users_borrar_notificaciones on public.users;
create trigger users_borrar_notificaciones after delete on public.users
  for each row execute function public.users_borrar_notificaciones();

create or replace function public.profesionales_borrar_consultas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.consultas where "professionalId" = old."professionalId";
  return old;
end $$;

drop trigger if exists profesionales_borrar_consultas on public.profesionales;
create trigger profesionales_borrar_consultas after delete on public.profesionales
  for each row execute function public.profesionales_borrar_consultas();

notify pgrst, 'reload schema';
