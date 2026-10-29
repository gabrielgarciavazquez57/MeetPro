-- PASO 5: archivos adjuntos de títulos y certificados (Supabase Storage).
-- Se puede correr con la app funcionando: solo crea el bucket y sus permisos.

-- Bucket público de lectura (los archivos se ven desde el perfil del profesional),
-- limitado a PDF e imágenes de hasta 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', true, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo puede escribir dentro de su propia carpeta: adjuntos/<id del usuario>/...
drop policy if exists adjuntos_select on storage.objects;
drop policy if exists adjuntos_insert on storage.objects;
drop policy if exists adjuntos_update on storage.objects;
drop policy if exists adjuntos_delete on storage.objects;

create policy adjuntos_select on storage.objects for select to authenticated
  using (bucket_id = 'adjuntos'
         and ((storage.foldername(name))[1] = public.mi_user_id() or public.soy_admin()));

create policy adjuntos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = public.mi_user_id());

create policy adjuntos_update on storage.objects for update to authenticated
  using (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = public.mi_user_id())
  with check (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = public.mi_user_id());

create policy adjuntos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'adjuntos'
         and ((storage.foldername(name))[1] = public.mi_user_id() or public.soy_admin()));
