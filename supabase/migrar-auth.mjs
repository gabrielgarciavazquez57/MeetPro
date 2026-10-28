// Crea una cuenta de Supabase Auth por cada fila de "users" que todavía no tenga una.
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<tu service_role key>"
//   $env:ADMIN_PASSWORD = "<contraseña NUEVA para los admins>"
//   node supabase/migrar-auth.mjs
// La service_role key es secreta: no la commitees ni la compartas.
// Hay que correrlo después de 02_auth_preparar.sql y ANTES de 03_auth_cerrar.sql,
// porque lee la columna "password" que ese segundo script elimina.

const BASE = 'https://akzgljtyiasfmqwiguzi.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!KEY) {
  console.error('Falta la variable SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const r = await fetch(`${BASE}/rest/v1/users?select=id,username,email,password,isAdmin,auth_id&order=username`, { headers });
if (!r.ok) {
  console.error('No se pudo leer users:', r.status, await r.text());
  process.exit(1);
}
const usuarios = await r.json();

let creadas = 0, omitidas = 0, fallidas = 0;

for (const u of usuarios) {
  if (u.auth_id) { omitidas++; continue; }

  const password = u.isAdmin ? ADMIN_PASSWORD : u.password;
  if (!password) {
    console.log(`OMITIDO  ${u.username}: ${u.isAdmin ? 'falta ADMIN_PASSWORD' : 'sin contraseña'}`);
    fallidas++;
    continue;
  }

  const a = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: u.email, password, email_confirm: true }),
  });
  const cuerpo = await a.json();
  if (!a.ok) {
    console.log(`FALLÓ    ${u.username} (${u.email}): ${cuerpo.msg ?? cuerpo.message ?? a.status}`);
    fallidas++;
    continue;
  }

  const p = await fetch(`${BASE}/rest/v1/users?id=eq.${encodeURIComponent(u.id)}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ auth_id: cuerpo.id }),
  });
  if (!p.ok) {
    console.log(`FALLÓ    ${u.username}: cuenta creada pero no se pudo vincular (${p.status})`);
    fallidas++;
    continue;
  }

  console.log(`OK       ${u.username}${u.isAdmin ? ' (admin)' : ''}`);
  creadas++;
}

console.log(`\nCreadas: ${creadas} · Ya tenían cuenta: ${omitidas} · Con problemas: ${fallidas}`);
