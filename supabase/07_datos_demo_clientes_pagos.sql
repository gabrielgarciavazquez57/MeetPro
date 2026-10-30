-- DATOS DE PRUEBA: clientes (turnos) y pagos recibidos para TODOS los profesionales.
-- Sirve para ver cómo quedan "Listado de clientes" y "Historial de pagos - Recibidos".
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
  p record;
  c jsonb;
  pos int := 0;
  k int;
  precio numeric;
  cliente jsonb;
  profesional jsonb;
  usuario jsonb;
  n_turnos int := 0;
  n_pagos int := 0;
begin
  for p in select * from public.profesionales order by id loop
    precio := coalesce((p.pago->>'precio')::numeric, 8000);
    profesional := jsonb_build_object(
      'id', p."profesional_userData"->>'id',
      'professionalId', p."professionalId",
      'name', p."profesional_userData"->>'name',
      'lastname', p."profesional_userData"->>'lastname',
      'profession', p.profession
    );

    -- 4 clientes por profesional, arrancando en uno distinto para que no se repitan siempre los mismos
    for k in 0..3 loop
      c := clientes -> ((pos + k) % 5);
      cliente := jsonb_build_object(
        'id', c->>'id', 'name', c->>'name', 'lastname', c->>'lastname',
        'dni', c->>'dni', 'email', c->>'email', 'phoneNumber', c->>'tel'
      );
      usuario := jsonb_build_object(
        'id', c->>'id', 'name', c->>'name', 'lastname', c->>'lastname', 'email', c->>'email'
      );

      -- Dos turnos ya realizados (confirmados con fecha pasada)
      insert into public.turnos (id, "professionalId", fecha, hora, duracion, modalidad, estado, cliente, motivo)
      values
        ('demo-t-' || p."professionalId" || '-' || (pos + k) % 5 || '-1', p."professionalId",
         (current_date - (7 + k * 3))::text, '10:00', 30, 'presencial', 'confirmado', cliente, 'Consulta de seguimiento'),
        ('demo-t-' || p."professionalId" || '-' || (pos + k) % 5 || '-2', p."professionalId",
         (current_date - (21 + k * 4))::text, '16:30', 30, 'online', 'confirmado', cliente, 'Primera consulta');
      n_turnos := n_turnos + 2;

      -- Pagos: dos aprobados y uno rechazado
      insert into public.tickets (id, "numeroComprobante", monto, fecha, profesional, usuario, estado,
                                  concepto, moneda, "ultimosDigitos", "esPrueba")
      values
        ('demo-p-' || p."professionalId" || '-' || (pos + k) % 5 || '-1',
         'PRUEBA-DEMO-' || upper(substr(md5(p."professionalId" || k || 'a'), 1, 6)),
         precio, now() - interval '6 days' - (k || ' days')::interval, profesional, usuario,
         'aprobado', 'Pago mensual', 'ARS', '4242', true),
        ('demo-p-' || p."professionalId" || '-' || (pos + k) % 5 || '-2',
         'PRUEBA-DEMO-' || upper(substr(md5(p."professionalId" || k || 'b'), 1, 6)),
         precio, now() - interval '35 days' - (k || ' days')::interval, profesional, usuario,
         'aprobado', 'Pago mensual', 'ARS', '4242', true),
        ('demo-p-' || p."professionalId" || '-' || (pos + k) % 5 || '-3',
         'PRUEBA-DEMO-' || upper(substr(md5(p."professionalId" || k || 'c'), 1, 6)),
         precio, now() - interval '36 days' - (k || ' days')::interval, profesional, usuario,
         'rechazado', 'Pago mensual', 'ARS', '0002', true);
      n_pagos := n_pagos + 3;
    end loop;

    pos := pos + 1;
  end loop;

  raise notice 'Creados % turnos y % pagos de demostración', n_turnos, n_pagos;
end $$;

select
  (select count(*) from public.turnos where id like 'demo-%') as turnos_demo,
  (select count(*) from public.tickets where id like 'demo-%') as pagos_demo;

-- Para quitar todo lo de la demo:
--   delete from public.tickets where id like 'demo-%';
--   delete from public.turnos  where id like 'demo-%';
