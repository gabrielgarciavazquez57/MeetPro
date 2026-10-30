-- DATOS DE PRUEBA para Sofía Benítez (usuario "sofiaben"), para ver cómo quedan:
--   * "Listado de clientes" e "Historial de pagos - Recibidos"  (ella como profesional)
--   * "Profesionales consultados" e "Historial de pagos - Realizados"  (ella como clienta de otros profesionales)
-- Se puede correr varias veces: borra lo anterior de la demo y lo vuelve a crear.
-- Todo lo que crea tiene un id que empieza con "demo-", así se puede quitar (ver el final).

delete from public.tickets where id like 'demo-%';
delete from public.turnos where id like 'demo-%';

do $$
declare
  clientes jsonb := '[
    {"id":"demo-cli-1","name":"Lucía","lastname":"Fernández","dni":"31245678","email":"lucia.fernandez@ejemplo.com","tel":"+54 9 11 5550 0101"},
    {"id":"demo-cli-2","name":"Martín","lastname":"Gómez","dni":"28911234","email":"martin.gomez@ejemplo.com","tel":"+54 9 11 5550 0102"},
    {"id":"demo-cli-3","name":"Camila","lastname":"Rodríguez","dni":"35678901","email":"camila.rodriguez@ejemplo.com","tel":"+54 9 11 5550 0103"},
    {"id":"demo-cli-4","name":"Joaquín","lastname":"Pérez","dni":"33456789","email":"joaquin.perez@ejemplo.com","tel":"+54 9 11 5550 0104"},
    {"id":"demo-cli-5","name":"Valentina","lastname":"Suárez","dni":"36123456","email":"valentina.suarez@ejemplo.com","tel":"+54 9 11 5550 0105"}
  ]'::jsonb;
  sofia record;
  sp record;
  p record;
  c jsonb;
  k int;
  precio numeric;
  cliente jsonb;
  profesional jsonb;
  usuario jsonb;
begin
  select * into sofia from public.users where username = 'sofiaben';
  if not found then
    raise exception 'No existe el usuario sofiaben';
  end if;

  select * into sp from public.profesionales where "profesional_userData"->>'id' = sofia.id;
  if not found then
    raise exception 'sofiaben no tiene perfil profesional';
  end if;

  -- ===== Sofía como profesional: 5 clientes con 2 turnos realizados y 3 pagos cada uno =====
  precio := coalesce((sp.pago->>'precio')::numeric, 8000);
  profesional := jsonb_build_object(
    'id', sofia.id, 'professionalId', sp."professionalId",
    'name', sofia.name, 'lastname', sofia.lastname, 'profession', sp.profession
  );

  for k in 0..4 loop
    c := clientes -> k;
    cliente := jsonb_build_object(
      'id', c->>'id', 'name', c->>'name', 'lastname', c->>'lastname',
      'dni', c->>'dni', 'email', c->>'email', 'phoneNumber', c->>'tel'
    );
    usuario := jsonb_build_object(
      'id', c->>'id', 'name', c->>'name', 'lastname', c->>'lastname', 'email', c->>'email'
    );

    insert into public.turnos (id, "professionalId", fecha, hora, duracion, modalidad, estado, cliente, motivo)
    values
      ('demo-t-' || k || '-1', sp."professionalId", (current_date - (5 + k * 3))::text,
       '10:00', 30, 'presencial', 'confirmado', cliente, 'Consulta de seguimiento'),
      ('demo-t-' || k || '-2', sp."professionalId", (current_date - (20 + k * 4))::text,
       '16:30', 30, 'online', 'confirmado', cliente, 'Primera consulta');

    insert into public.tickets (id, "numeroComprobante", monto, fecha, profesional, usuario, estado,
                                concepto, moneda, "ultimosDigitos", "esPrueba")
    values
      ('demo-p-' || k || '-1', 'PRUEBA-DEMO-' || upper(substr(md5('r' || k || 'a'), 1, 6)),
       precio, now() - interval '5 days' - (k || ' days')::interval, profesional, usuario,
       'aprobado', 'Pago mensual', 'ARS', '4242', true),
      ('demo-p-' || k || '-2', 'PRUEBA-DEMO-' || upper(substr(md5('r' || k || 'b'), 1, 6)),
       precio, now() - interval '35 days' - (k || ' days')::interval, profesional, usuario,
       'aprobado', 'Pago mensual', 'ARS', '4242', true),
      ('demo-p-' || k || '-3', 'PRUEBA-DEMO-' || upper(substr(md5('r' || k || 'c'), 1, 6)),
       precio, now() - interval '36 days' - (k || ' days')::interval, profesional, usuario,
       'rechazado', 'Pago mensual', 'ARS', '0002', true);
  end loop;

  -- ===== Sofía como clienta: consultó con 4 profesionales (turnos realizados + pagos) =====
  cliente := jsonb_build_object(
    'id', sofia.id, 'name', sofia.name, 'lastname', sofia.lastname,
    'dni', sofia.dni, 'email', sofia.email, 'phoneNumber', sofia."phoneNumber"
  );
  usuario := jsonb_build_object(
    'id', sofia.id, 'name', sofia.name, 'lastname', sofia.lastname, 'email', sofia.email
  );
  k := 0;

  for p in select * from public.profesionales where id <> sp.id order by id limit 4 loop
    precio := coalesce((p.pago->>'precio')::numeric, 8000);
    profesional := jsonb_build_object(
      'id', p."profesional_userData"->>'id', 'professionalId', p."professionalId",
      'name', p."profesional_userData"->>'name', 'lastname', p."profesional_userData"->>'lastname',
      'profession', p.profession
    );

    -- cantidad de consultas distinta por profesional: 1, 2, 3 y 2
    insert into public.turnos (id, "professionalId", fecha, hora, duracion, modalidad, estado, cliente, motivo)
    select 'demo-t-c' || k || '-' || g, p."professionalId", (current_date - (4 + k * 5 + g * 12))::text,
           '11:00', 30, case when g % 2 = 0 then 'online' else 'presencial' end,
           'confirmado', cliente, 'Consulta de seguimiento'
    from generate_series(1, case k when 0 then 1 when 2 then 3 else 2 end) as g;

    insert into public.tickets (id, "numeroComprobante", monto, fecha, profesional, usuario, estado,
                                concepto, moneda, "ultimosDigitos", "esPrueba")
    values
      ('demo-p-c' || k || '-1', 'PRUEBA-DEMO-' || upper(substr(md5('c' || k || 'a'), 1, 6)),
       precio, now() - (3 + k * 5 || ' days')::interval, profesional, usuario,
       'aprobado', 'Pago mensual', 'ARS', '4242', true);

    if k = 1 then
      insert into public.tickets (id, "numeroComprobante", monto, fecha, profesional, usuario, estado,
                                  concepto, moneda, "ultimosDigitos", "esPrueba")
      values
        ('demo-p-c' || k || '-2', 'PRUEBA-DEMO-' || upper(substr(md5('c' || k || 'b'), 1, 6)),
         precio, now() - (2 + k * 5 || ' days')::interval, profesional, usuario,
         'rechazado', 'Pago mensual', 'ARS', '0002', true);
    end if;

    k := k + 1;
  end loop;

  raise notice 'Demo cargada para % %', sofia.name, sofia.lastname;
end $$;

select
  (select count(*) from public.turnos where id like 'demo-%') as turnos_demo,
  (select count(*) from public.tickets where id like 'demo-%') as pagos_demo;

-- Para quitar todo lo de la demo:
--   delete from public.tickets where id like 'demo-%';
--   delete from public.turnos  where id like 'demo-%';
