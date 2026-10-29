export type EstadoTicket = 'aprobado' | 'rechazado';

/** Datos mínimos del profesional que cobra (copia del momento del pago, no una referencia viva) */
export interface TicketProfesional {
  /** ID del usuario dueño del perfil profesional */
  id: string | number;
  /** Matrícula del profesional */
  professionalId: string;
  name: string;
  lastname: string;
  profession: string;
}

/** Datos mínimos del usuario que paga (copia del momento del pago, no una referencia viva) */
export interface TicketUsuario {
  id: string | number;
  name: string;
  lastname: string;
  email: string;
}

/** Comprobante de un pago */
export interface Ticket {
  id?: string;
  /** Número visible del comprobante (ej. "PRUEBA-G8RTNE") */
  numeroComprobante: string;
  /** Importe pagado (admite decimales, ej. 7500.50) */
  monto: number;
  /** Fecha y hora del pago en formato ISO (ej. "2026-10-30T15:42:10.000Z") */
  fecha: string;
  profesional: TicketProfesional;
  usuario: TicketUsuario;
  /** Resultado del pago */
  estado: EstadoTicket;
  /** Qué se pagó (ej. "Pago mensual") */
  concepto: string;
  /** Moneda del importe (ej. "ARS") */
  moneda: string;
  /** Últimos 4 dígitos de la tarjeta usada: nunca se guarda el número completo */
  ultimosDigitos?: string;
  /** true mientras el sistema de pago sea simulado: ningún ticket corresponde a un cobro real */
  esPrueba: boolean;
}
