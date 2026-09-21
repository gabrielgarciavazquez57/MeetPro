import { ClienteTurno, ConfigDisponibilidad, EstadoTurno, Turno } from '../interfaces/turno';
import { User } from '../interfaces/user';

export type EstadoVisible = EstadoTurno | 'vencido';

type Franja = Pick<Turno, 'fecha' | 'hora' | 'duracion'>;

export const MAX_HORARIOS = 200;
export const DURACIONES = [15, 20, 30, 45, 60, 90] as const;
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const ETIQUETAS_ESTADO: Record<EstadoVisible, string> = {
  disponible: 'Disponible',
  pendiente: 'Pendiente de confirmación',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  completado: 'Realizado',
  ausente: 'No asistió',
  vencido: 'Vencido',
};

const dos = (n: number) => String(n).padStart(2, '0');

// ===== Fechas y horas =====
export function aISO(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function hoyISO(): string {
  return aISO(new Date());
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00`);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function deMinutos(min: number): string {
  return `${dos(Math.floor(min / 60))}:${dos(min % 60)}`;
}

export function sumarMinutos(hora: string, min: number): string {
  return deMinutos((aMinutos(hora) + min) % 1440);
}

export function nombreMes(anio: number, mes: number): string {
  const nombre = MESES[mes];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** "Lunes 21 de septiembre" */
export function formatearFecha(fecha: string): string {
  const d = new Date(`${fecha}T00:00`);
  if (isNaN(d.getTime())) {
    return fecha;
  }
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "sep" para el bloque de fecha de las tarjetas */
export function mesCorto(fecha: string): string {
  const d = new Date(`${fecha}T00:00`);
  return isNaN(d.getTime()) ? '' : MESES[d.getMonth()].slice(0, 3);
}

export function diaDelMes(fecha: string): string {
  const d = new Date(`${fecha}T00:00`);
  return isNaN(d.getTime()) ? '' : String(d.getDate());
}

export function diaCorto(fecha: string): string {
  const d = new Date(`${fecha}T00:00`);
  return isNaN(d.getTime()) ? '' : DIAS_CORTOS[d.getDay()];
}

/** "Hoy" / "Mañana" / "" */
export function etiquetaDia(fecha: string): string {
  if (fecha === hoyISO()) {
    return 'Hoy';
  }
  if (fecha === sumarDias(hoyISO(), 1)) {
    return 'Mañana';
  }
  return '';
}

// ===== Estado de un turno =====
export function inicioTurno(t: Pick<Turno, 'fecha' | 'hora'>): Date {
  return new Date(`${t.fecha}T${t.hora || '00:00'}`);
}

export function finTurno(t: Franja): Date {
  return new Date(inicioTurno(t).getTime() + (t.duracion || 30) * 60000);
}

export function rangoHorario(t: Franja): string {
  return `${t.hora} – ${sumarMinutos(t.hora, t.duracion || 30)}`;
}

export function haComenzado(t: Franja): boolean {
  return inicioTurno(t).getTime() <= Date.now();
}

export function haTerminado(t: Franja): boolean {
  return finTurno(t).getTime() <= Date.now();
}

/** Turno que todavía requiere atención: pendiente que no empezó o confirmado que no terminó */
export function esActivo(t: Turno): boolean {
  if (t.estado === 'pendiente') {
    return !haComenzado(t);
  }
  if (t.estado === 'confirmado') {
    return !haTerminado(t);
  }
  return false;
}

/** Estado que se muestra al usuario (un confirmado pasado es "Realizado", un pendiente pasado "Vencido") */
export function estadoVisible(t: Turno): EstadoVisible {
  if (t.estado === 'confirmado' && haTerminado(t)) {
    return 'completado';
  }
  if (t.estado === 'pendiente' && haComenzado(t)) {
    return 'vencido';
  }
  return t.estado;
}

export function seSuperponen(a: Franja, b: Franja): boolean {
  return inicioTurno(a) < finTurno(b) && inicioTurno(b) < finTurno(a);
}

/** Turnos que ocupan el horario del profesional */
export function ocupaHorario(t: Turno): boolean {
  return t.estado === 'disponible' || t.estado === 'pendiente' || t.estado === 'confirmado';
}

export function ordenarPorFecha<T extends Pick<Turno, 'fecha' | 'hora'>>(lista: T[], descendente = false): T[] {
  const orden = [...lista].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  return descendente ? orden.reverse() : orden;
}

export function agruparPorDia<T extends Pick<Turno, 'fecha'>>(lista: T[]): { fecha: string; turnos: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const t of lista) {
    const actual = grupos.get(t.fecha) ?? [];
    actual.push(t);
    grupos.set(t.fecha, actual);
  }
  return [...grupos].map(([fecha, turnos]) => ({ fecha, turnos }));
}

export function aClienteTurno(u: User): ClienteTurno {
  return {
    id: u.id ?? '',
    name: u.name,
    lastname: u.lastname,
    dni: u.dni,
    email: u.email,
    phoneNumber: u.phoneNumber,
  };
}

// ===== Generación de disponibilidad =====
/** Todos los horarios que resultan de la configuración (sin filtrar por conflictos) */
export function calcularHorarios(cfg: ConfigDisponibilidad): { fecha: string; hora: string }[] {
  const resultado: { fecha: string; hora: string }[] = [];
  if (!cfg.desde || !cfg.hasta || !cfg.horaInicio || !cfg.horaFin || !cfg.duracion || !cfg.dias.length) {
    return resultado;
  }

  const inicio = aMinutos(cfg.horaInicio);
  const fin = aMinutos(cfg.horaFin);
  if (isNaN(inicio) || isNaN(fin) || fin <= inicio) {
    return resultado;
  }

  const cursor = new Date(`${cfg.desde}T00:00`);
  const limite = new Date(`${cfg.hasta}T00:00`);
  let diasRecorridos = 0;

  while (cursor <= limite && diasRecorridos < 400 && resultado.length <= MAX_HORARIOS) {
    if (cfg.dias.includes(cursor.getDay())) {
      for (let m = inicio; m + cfg.duracion <= fin; m += cfg.duracion) {
        resultado.push({ fecha: aISO(cursor), hora: deMinutos(m) });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    diasRecorridos++;
  }

  return resultado;
}

/** Horarios que efectivamente se crearían: futuros y sin superponerse con turnos existentes */
export function horariosNuevos(
  cfg: ConfigDisponibilidad,
  existentes: Turno[],
): { fecha: string; hora: string }[] {
  const ocupados = existentes.filter(ocupaHorario);
  return calcularHorarios(cfg).filter((h) => {
    const candidato: Franja = { fecha: h.fecha, hora: h.hora, duracion: cfg.duracion };
    return !haComenzado(candidato) && !ocupados.some((o) => seSuperponen(o, candidato));
  });
}
