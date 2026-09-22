import { countries, type ICountry } from 'countries-list';

export interface CodigoPais {
  iso: string;
  nombre: string;
  codigo: string; // "+54"
  bandera: string; // 🇦🇷
}

/** Emoji de bandera a partir del código ISO 3166-1 alpha-2 (ej. "AR" -> 🇦🇷) */
function banderaDe(iso: string): string {
  return [...iso.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}

export const CODIGOS_PAIS: CodigoPais[] = Object.entries(countries)
  .filter(([, c]) => (c as ICountry).phone?.length)
  .map(([iso, c]) => ({
    iso,
    nombre: (c as ICountry).name,
    codigo: `+${(c as ICountry).phone[0]}`,
    bandera: banderaDe(iso),
  }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const CODIGO_PAIS_DEFECTO = CODIGOS_PAIS.find((c) => c.iso === 'AR')!.codigo;

// Se prueba el código más largo primero (ej. "+54" antes que "+5"), para no cortar mal
const CODIGOS_POR_LARGO = [...CODIGOS_PAIS].sort((a, b) => b.codigo.length - a.codigo.length);

function buscarCodigo(valor: string): CodigoPais | undefined {
  return CODIGOS_POR_LARGO.find((c) => valor.startsWith(c.codigo));
}

/**
 * Separa un teléfono guardado en "código + número" (ej. "+54 1145551234").
 * Si no arranca con un código conocido, se asume que es un número viejo sin código
 * y se le deja puesto el código por defecto.
 */
export function separarTelefono(valor: string): { codigo: string; numero: string } {
  const limpio = (valor ?? '').trim();
  const candidato = limpio.startsWith('+') ? buscarCodigo(limpio) : undefined;
  if (candidato) {
    return { codigo: candidato.codigo, numero: limpio.slice(candidato.codigo.length).trim() };
  }
  return { codigo: CODIGO_PAIS_DEFECTO, numero: limpio };
}

/**
 * Para mostrar un teléfono con bandera: solo si el valor guardado tiene un código explícito
 * (arranca con "+"). Los números viejos sin código se muestran tal cual, sin inventar uno.
 */
export function formatearTelefono(valor: string): { bandera: string; codigo: string; numero: string } | null {
  const limpio = (valor ?? '').trim();
  if (!limpio.startsWith('+')) {
    return null;
  }
  const candidato = buscarCodigo(limpio);
  if (!candidato) {
    return null;
  }
  return { bandera: candidato.bandera, codigo: candidato.codigo, numero: limpio.slice(candidato.codigo.length).trim() };
}
