import { TRADUCCIONES_1 } from './parte-1';
import { TRADUCCIONES_2 } from './parte-2';
import { TRADUCCIONES_3 } from './parte-3';

const normalizar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();
const escaparRegex = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EXACTAS = new Map<string, string>();
const PATRONES: { re: RegExp; en: string }[] = [];

for (const [es, en] of [...TRADUCCIONES_1, ...TRADUCCIONES_2, ...TRADUCCIONES_3]) {
  const clave = normalizar(es);
  if (/\{#?\d\}/.test(clave)) {
    // {#0} es un número y {0} es cualquier dato
    const patron = escaparRegex(clave)
      .replace(/\\\{#(\d)\\\}/g, '(\\d+)')
      .replace(/\\\{(\d)\\\}/g, '(.+?)');
    PATRONES.push({ re: new RegExp(`^${patron}$`), en });
  } else {
    EXACTAS.set(clave, en);
  }
}

const DIAS: Record<string, string> = {
  lunes: 'Monday', martes: 'Tuesday', miércoles: 'Wednesday', jueves: 'Thursday',
  viernes: 'Friday', sábado: 'Saturday', domingo: 'Sunday',
};
const MESES: Record<string, string> = {
  enero: 'January', febrero: 'February', marzo: 'March', abril: 'April', mayo: 'May', junio: 'June',
  julio: 'July', agosto: 'August', septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December',
};
const MESES_CORTOS = new Map<string, string>([['ene', 'jan'], ['abr', 'apr'], ['ago', 'aug'], ['dic', 'dec']]);
const NOMBRES_DIA = Object.keys(DIAS).join('|');
const NOMBRES_MES = Object.keys(MESES).join('|');
const FECHA_LARGA = new RegExp(`^(${NOMBRES_DIA}) (\\d{1,2}) de (${NOMBRES_MES})$`, 'i');
const MES_ANIO = new RegExp(`^(${NOMBRES_MES}) (\\d{4})$`, 'i');
const DIA_MES = new RegExp(`^(\\d{1,2}) de (${NOMBRES_MES})$`, 'i');

/** "Lunes 21 de septiembre" → "Monday, September 21"; "Septiembre 2026" → "September 2026"; "ene" → "jan" */
function traducirFecha(texto: string): string | null {
  const corto = MESES_CORTOS.get(texto);
  if (corto !== undefined) {
    return corto;
  }
  let m = FECHA_LARGA.exec(texto);
  if (m) {
    return `${DIAS[m[1].toLowerCase()]}, ${MESES[m[3].toLowerCase()]} ${m[2]}`;
  }
  m = MES_ANIO.exec(texto);
  if (m) {
    return `${MESES[m[1].toLowerCase()]} ${m[2]}`;
  }
  m = DIA_MES.exec(texto);
  if (m) {
    return `${MESES[m[2].toLowerCase()]} ${m[1]}`;
  }
  return null;
}

/** Un dato incrustado en una frase: se traduce si es un texto conocido, también cuando es una lista separada por comas */
function traducirDato(dato: string): string {
  const entero = traducir(dato);
  if (entero !== null) {
    return entero;
  }
  if (dato.includes(', ')) {
    return dato.split(', ').map((parte) => traducir(parte) ?? parte).join(', ');
  }
  return dato;
}

/** Devuelve el texto en inglés, o null si no está en el diccionario (se deja como está: nombres, datos del usuario, etc.) */
export function traducir(texto: string): string | null {
  const t = normalizar(texto);
  if (!t) {
    return null;
  }
  const directa = EXACTAS.get(t);
  if (directa !== undefined) {
    return directa;
  }
  for (const { re, en } of PATRONES) {
    const m = re.exec(t);
    if (m) {
      return en.replace(/\{#?(\d)\}/g, (_, i: string) => traducirDato(m[Number(i) + 1]));
    }
  }
  return traducirFecha(t);
}
