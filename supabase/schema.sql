-- MeetPro: esquema inicial (espeja las colecciones de database/db.json).
-- Etapa 1: las políticas RLS permiten todo al rol anon, igual que json-server hoy.
-- Cuando se migre el login a Supabase Auth, estas políticas deben restringirse.

create table if not exists public.users (
  id text primary key,
  username text,
  password text,
  "isProfesional" boolean default false,
  "isAdmin" boolean default false,
  name text,
  lastname text,
  dni text,
  email text,
  "phoneNumber" text,
  gender text,
  nationality text,
  "dateOfBirth" text,
  "fotoPerfil" text default '',
  address jsonb,
  age integer
);

create table if not exists public.profesionales (
  id text primary key,
  "profesional_userData" jsonb,
  profession text,
  "professionalId" text,
  descriptionprofesional text,
  linkedin text,
  titulos jsonb default '[]'::jsonb,
  experiencias jsonb default '[]'::jsonb,
  certificados jsonb default '[]'::jsonb,
  "linkReunion" text,
  "direccionPresencial" text,
  pago jsonb
);

create table if not exists public.turnos (
  id text primary key,
  "professionalId" text,
  fecha text,
  hora text,
  duracion integer,
  modalidad text,
  estado text,
  cliente jsonb,
  motivo text,
  "notaProfesional" text,
  "canceladoPor" text,
  "motivoCancelacion" text,
  "enlaceReunion" text
);

create table if not exists public.valoraciones (
  id text primary key,
  "professionalId" text,
  "userId" text,
  nombre text,
  apellido text,
  fecha text,
  puntaje integer,
  descripcion text
);

create table if not exists public."informacionesProfesionales" (
  id text primary key,
  "professionalId" text,
  "profesional_userData" jsonb,
  "descripcionAmpliada" text
);

create table if not exists public.proyectos (
  id text primary key,
  "professionalId" text,
  titulo_proyecto text,
  fecha_inicio text,
  fecha_finalizacion text,
  descripcion_proyecto text,
  imagen_proyecto text,
  link_adjunto text
);

create table if not exists public."contenido-profesional-cliente" (
  id text primary key,
  "professionalId" text,
  tipo text,
  titulo text,
  fecha text,
  hora text,
  descripcion text,
  link text
);

create index if not exists turnos_prof_idx on public.turnos ("professionalId");
create index if not exists valoraciones_prof_idx on public.valoraciones ("professionalId");
create index if not exists proyectos_prof_idx on public.proyectos ("professionalId");

do $$
declare t text;
begin
  foreach t in array array[
    'users','profesionales','turnos','valoraciones',
    'informacionesProfesionales','proyectos','contenido-profesional-cliente'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "etapa1_all" on public.%I', t);
    execute format(
      'create policy "etapa1_all" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
