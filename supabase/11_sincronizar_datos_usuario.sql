-- PASO 11: la foto y los datos públicos del usuario se reflejan solos en su perfil profesional.
-- Se puede correr con la app funcionando. Es seguro volver a correrlo.

-- Datos públicos del usuario que se copian dentro de profesionales e informacionesProfesionales
create or replace function public.datos_publicos_usuario(u public.users) returns jsonb
language sql immutable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', u.id,
    'isProfesional', u."isProfesional",
    'name', u.name,
    'lastname', u.lastname,
    'email', u.email,
    'phoneNumber', u."phoneNumber",
    'fotoPerfil', u."fotoPerfil",
    'address', case when u.address is null then null else jsonb_build_object(
      'city', u.address->'city', 'province', u.address->'province', 'country', u.address->'country') end
  ))
$$;

-- Cada vez que el usuario cambia sus datos, se actualiza la copia en sus perfiles
create or replace function public.sincronizar_datos_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profesionales
     set "profesional_userData" = coalesce("profesional_userData", '{}'::jsonb) || public.datos_publicos_usuario(new)
   where "profesional_userData"->>'id' = new.id;
  update public."informacionesProfesionales"
     set "profesional_userData" = coalesce("profesional_userData", '{}'::jsonb) || public.datos_publicos_usuario(new)
   where "profesional_userData"->>'id' = new.id;
  return new;
end
$$;

drop trigger if exists users_sincronizar_datos on public.users;
create trigger users_sincronizar_datos
  after update of name, lastname, email, "phoneNumber", "fotoPerfil", address, "isProfesional"
  on public.users
  for each row execute function public.sincronizar_datos_usuario();

-- Una sola vez: pone al día lo que ya estaba guardado (por ejemplo la foto de Sofía)
update public.profesionales p
   set "profesional_userData" = coalesce(p."profesional_userData", '{}'::jsonb) || public.datos_publicos_usuario(u)
  from public.users u
 where p."profesional_userData"->>'id' = u.id;

update public."informacionesProfesionales" i
   set "profesional_userData" = coalesce(i."profesional_userData", '{}'::jsonb) || public.datos_publicos_usuario(u)
  from public.users u
 where i."profesional_userData"->>'id' = u.id;
