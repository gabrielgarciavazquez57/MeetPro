// Crea una cuenta de Supabase Auth para cada fila de "users" que todavía no tenga una
// y la vincula con su perfil. Todas las cuentas nuevas reciben la misma contraseña inicial.
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<tu service_role key>"
//   $env:PASSWORD_INICIAL = "<contraseña inicial, mínimo 6 caracteres>"
//   node supabase/crear-cuentas.mjs
// La service_role key es secreta: no la commitees ni la compartas.

const BASE = 'https://akzgljtyiasfmqwiguzi.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.PASSWORD_INICIAL;

if (!KEY || !PASSWORD) {
  console.error('Faltan las variables SUPABASE_SERVICE_ROLE_KEY y PASSWORD_INICIAL');
  process.exit(1);
}
if (PASSWORD.length < 6) {
  console.error('PASSWORD_INICIAL debe tener al menos 6 caracteres');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const r = await fetch(`${BASE}/rest/v1/users?select=id,username,email,isAdmin&auth_id=is.null&order=username`, { headers });
if (!r.ok) {
  console.error('No se pudo leer users:', r.status, await r.text());
  process.exit(1);
}
const usuarios = await r.json();

if (!usuarios.length) {
  console.log('Todos los usuarios ya tienen cuenta.');
  process.exit(0);
}

let creadas = 0, fallidas = 0;

for (const u of usuarios) {
  if (u.isAdmin) {
    console.log(`OMITIDO  ${u.username}: es admin, no se le asigna la contraseña inicial`);
    continue;
  }

  const a = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: u.email, password: PASSWORD, email_confirm: true }),
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

  console.log(`OK       ${u.username}`);
  creadas++;
}

console.log(`\nCreadas: ${creadas} · Con problemas: ${fallidas}`);
