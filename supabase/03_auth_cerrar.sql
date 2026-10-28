-- PASO 3 de la migración. Correr SOLO después de:
--   a) haber corrido 02_auth_preparar.sql,
--   b) haber migrado las cuentas con supabase/migrar-auth.mjs,
--   c) haber publicado la versión de la app que usa Supabase Auth.
-- Cierra los permisos abiertos de la etapa 1 y elimina las contraseñas en texto plano.

-- ===== Datos sensibles =====
-- Las copias del usuario dentro de profesionales/informaciones quedan con datos públicos solamente
update public.profesionales set "profesional_userData" =
  case when "profesional_userData" ? 'address'
    then jsonb_set("profesional_userData", '{address}', ("profesional_userData"->'address') - 'address' - 'zipCode')
    else "profesional_userData" end
  - 'password' - 'dni' - 'dateOfBirth' - 'age' - 'gender' - 'nationality' - 'username' - 'isAdmin' - 'auth_id';

update public."informacionesProfesionales" set "profesional_userData" =
  case when "profesional_userData" ? 'address'
    then jsonb_set("profesional_userData", '{address}', ("profesional_userData"->'address') - 'address' - 'zipCode')
    else "profesional_userData" end
  - 'password' - 'dni' - 'dateOfBirth' - 'age' - 'gender' - 'nationality' - 'username' - 'isAdmin' - 'auth_id';

alter table public.users drop column if exists password;

-- ===== Políticas =====
do $$
declare t text; p record;
begin
  foreach t in array array[
    'users','profesionales','turnos','valoraciones',
    'informacionesProfesionales','proyectos','contenido-profesional-cliente'
  ] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- users: cada uno ve y edita lo suyo; el admin ve todo
create policy users_select on public.users for select to authenticated
  using (auth_id = auth.uid() or public.soy_admin());
create policy users_insert on public.users for insert to authenticated
  with check (auth_id = auth.uid() and coalesce("isAdmin", false) = false);
create policy users_update on public.users for update to authenticated
  using (auth_id = auth.uid() or public.soy_admin())
  with check (auth_id = auth.uid() or public.soy_admin());
create policy users_delete on public.users for delete to authenticated
  using (auth_id = auth.uid() or public.soy_admin());

-- profesionales: lectura pública (sin admins), escritura solo del dueño
create policy prof_select on public.profesionales for select to anon, authenticated
  using (public.perfil_visible("profesional_userData"->>'id')
         or "profesional_userData"->>'id' = public.mi_user_id()
         or public.soy_admin());
create policy prof_insert on public.profesionales for insert to authenticated
  with check ("profesional_userData"->>'id' = public.mi_user_id() or public.soy_admin());
create policy prof_update on public.profesionales for update to authenticated
  using ("profesional_userData"->>'id' = public.mi_user_id() or public.soy_admin())
  with check ("profesional_userData"->>'id' = public.mi_user_id() or public.soy_admin());
create policy prof_delete on public.profesionales for delete to authenticated
  using ("profesional_userData"->>'id' = public.mi_user_id() or public.soy_admin());

-- turnos: libres para todos; el resto solo para el profesional dueño y el cliente
create policy turnos_select on public.turnos for select to anon, authenticated
  using (estado = 'disponible'
         or public.soy_profesional_de("professionalId")
         or cliente->>'id' = public.mi_user_id()
         or public.soy_admin());
create policy turnos_insert on public.turnos for insert to authenticated
  with check (
    public.soy_profesional_de("professionalId") or public.soy_admin()
    or (estado = 'disponible' and cliente is null and public.tengo_turno_con("professionalId")));
create policy turnos_update on public.turnos for update to authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin()
         or estado = 'disponible' or cliente->>'id' = public.mi_user_id())
  with check (public.soy_profesional_de("professionalId") or public.soy_admin()
              or cliente->>'id' = public.mi_user_id());
create policy turnos_delete on public.turnos for delete to authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin()
         or cliente->>'id' = public.mi_user_id());

-- valoraciones: lectura pública; cada uno escribe y borra las suyas
create policy val_select on public.valoraciones for select to anon, authenticated using (true);
create policy val_insert on public.valoraciones for insert to authenticated
  with check ("userId" = public.mi_user_id());
create policy val_delete on public.valoraciones for delete to authenticated
  using ("userId" = public.mi_user_id()
         or public.soy_profesional_de("professionalId") or public.soy_admin());

-- proyectos e información ampliada: lectura pública, escritura del profesional dueño
create policy proy_select on public.proyectos for select to anon, authenticated using (true);
create policy proy_write on public.proyectos for all to authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin())
  with check (public.soy_profesional_de("professionalId") or public.soy_admin());

create policy info_select on public."informacionesProfesionales" for select to anon, authenticated using (true);
create policy info_write on public."informacionesProfesionales" for all to authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin())
  with check (public.soy_profesional_de("professionalId") or public.soy_admin());

-- contenido: lo del profesional abierto (sin dniCliente) lo ve cualquiera; el dirigido, solo ese cliente
create policy cont_select on public."contenido-profesional-cliente" for select to anon, authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin()
         or (tipo = 'cliente' and auth.uid() is not null)
         or (tipo = 'profesional' and (coalesce("dniCliente", '') = '' or "dniCliente" = public.mi_dni())));
create policy cont_insert on public."contenido-profesional-cliente" for insert to authenticated
  with check (public.soy_profesional_de("professionalId") or public.soy_admin() or tipo = 'cliente');
create policy cont_update on public."contenido-profesional-cliente" for update to authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin())
  with check (public.soy_profesional_de("professionalId") or public.soy_admin());
create policy cont_delete on public."contenido-profesional-cliente" for delete to authenticated
  using (public.soy_profesional_de("professionalId") or public.soy_admin()
         or ("dniCliente" is not null and "dniCliente" = public.mi_dni()));

notify pgrst, 'reload schema';
