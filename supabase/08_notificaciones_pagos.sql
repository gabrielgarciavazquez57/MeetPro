-- PASO 8: notificaciones de pagos. Se puede correr con la app funcionando.
-- Requiere haber corrido antes 04_notificaciones.sql y 06_tickets.sql.
--
--   * Pago aprobado:  avisa al profesional ("Recibiste un pago") y a quien pagó ("Pago aprobado").
--   * Pago rechazado: avisa solo a quien pagó.
-- Los pagos de demostración (id "demo-...") no generan avisos.

create or replace function public.tickets_notificar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  monto_txt text := '$ ' || translate(to_char(new.monto, 'FM999,999,999,990.00'), ',.', '.,');
  pagador text := trim(coalesce(new.usuario->>'name', '') || ' ' || coalesce(new.usuario->>'lastname', ''));
  cobrador text := trim(coalesce(new.profesional->>'name', '') || ' ' || coalesce(new.profesional->>'lastname', ''));
begin
  if new.id like 'demo-%' then
    return new;
  end if;

  if new.estado = 'aprobado' then
    perform public.notificar(
      new.profesional->>'id', 'pago_recibido', 'Recibiste un pago',
      pagador || ' te pagó ' || monto_txt || ' (' || new."numeroComprobante" || ').',
      '/pagos-recibidos', 'pago:' || new.id || ':cobro');
    perform public.notificar(
      new.usuario->>'id', 'pago_realizado', 'Pago aprobado',
      'Tu pago de ' || monto_txt || ' a ' || cobrador || ' fue aprobado (' || new."numeroComprobante" || ').',
      '/pagos-realizados', 'pago:' || new.id || ':pago');
  else
    perform public.notificar(
      new.usuario->>'id', 'pago_realizado', 'Pago rechazado',
      'Tu pago de ' || monto_txt || ' a ' || cobrador || ' fue rechazado (' || new."numeroComprobante" || ').',
      '/pagos-realizados', 'pago:' || new.id || ':pago');
  end if;
  return new;
end $$;

drop trigger if exists tickets_notificar on public.tickets;
create trigger tickets_notificar after insert on public.tickets
  for each row execute function public.tickets_notificar();

notify pgrst, 'reload schema';
