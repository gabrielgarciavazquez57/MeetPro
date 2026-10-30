-- PASO 10: video de presentación del profesional (link o archivo). Se puede correr con la app funcionando.
-- IMPORTANTE: correrlo ANTES de publicar la versión de la app que usa el video.

-- Dónde se guarda: un dato opcional en el perfil profesional.
--   { "tipo": "link",    "url": "https://..." }
--   { "tipo": "archivo", "url": "<link público del archivo>", "nombre": "presentacion.mp4" }
alter table public.profesionales add column if not exists video jsonb;

-- Bucket público de lectura (el video se ve desde el perfil), solo MP4, WEBM y MOV de hasta 50 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo escribe dentro de su propia carpeta: videos/<id del usuario>/...
drop policy if exists videos_select on storage.objects;
drop policy if exists videos_insert on storage.objects;
drop policy if exists videos_update on storage.objects;
drop policy if exists videos_delete on storage.objects;

create policy videos_select on storage.objects for select to authenticated
  using (bucket_id = 'videos'
         and ((storage.foldername(name))[1] = public.mi_user_id() or public.soy_admin()));

create policy videos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = public.mi_user_id());

create policy videos_update on storage.objects for update to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = public.mi_user_id())
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = public.mi_user_id());

create policy videos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'videos'
         and ((storage.foldername(name))[1] = public.mi_user_id() or public.soy_admin()));

notify pgrst, 'reload schema';
