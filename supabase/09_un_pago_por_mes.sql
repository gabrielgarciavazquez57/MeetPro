-- PASO 9: un solo pago aprobado por mes a cada profesional. Se puede correr con la app funcionando.
-- Requiere haber corrido antes 06_tickets.sql.
--
-- Si alguien intenta registrar un segundo pago APROBADO al mismo profesional en el mismo mes
-- (según la hora de Argentina), la base lo rechaza con el error PAGO_MENSUAL_DUPLICADO.
-- Los pagos rechazados no cuentan, y los pagos de demostración (id "demo-...") tampoco.
-- Solo se controla lo que se registre desde ahora: los pagos de prueba anteriores no se tocan.

create or replace function public.tickets_un_pago_por_mes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'aprobado' and new.id not like 'demo-%' and exists (
    select 1 from public.tickets t
    where t.estado = 'aprobado'
      and t.id not like 'demo-%'
      and t.usuario->>'id' = new.usuario->>'id'
      and t.profesional->>'id' = new.profesional->>'id'
      and date_trunc('month', t.fecha at time zone 'America/Argentina/Buenos_Aires')
        = date_trunc('month', new.fecha at time zone 'America/Argentina/Buenos_Aires')
  ) then
    raise exception 'PAGO_MENSUAL_DUPLICADO';
  end if;
  return new;
end $$;

drop trigger if exists tickets_un_pago_por_mes on public.tickets;
create trigger tickets_un_pago_por_mes before insert on public.tickets
  for each row execute function public.tickets_un_pago_por_mes();

notify pgrst, 'reload schema';
