export type EstadoTurno =
  | 'disponible'
  | 'pendiente'
  | 'confirmado'
  | 'rechazado'
  | 'cancelado'
  | 'completado'
  | 'ausente';

export type ModalidadTurno = 'online' | 'presencial';

/** Datos mínimos del cliente que reservó (nunca se guarda el usuario completo) */
export interface ClienteTurno {
  id: string | number;
  name: string;
  lastname: string;
  dni: string;
  email: string;
  phoneNumber: string;
}

export interface Turno {
  id?: string;
  /** Matrícula del profesional dueño del turno */
  professionalId: string;
  fecha: string;                 // 'YYYY-MM-DD'
  hora: string;                  // 'HH:mm'
  duracion: number;              // minutos
  modalidad: ModalidadTurno;
  estado: EstadoTurno;
  cliente?: ClienteTurno | null;
  /** Motivo de la consulta, escrito por el cliente al solicitar */
  motivo?: string;
  /** Mensaje del profesional, visible para el cliente */
  notaProfesional?: string;
  /** Link de videollamada (turnos online confirmados) */
  enlaceReunion?: string;
  canceladoPor?: 'cliente' | 'profesional';
  motivoCancelacion?: string;
}

/** Parámetros para generar horarios de disponibilidad en lote */
export interface ConfigDisponibilidad {
  /** Días de la semana: 0 = domingo ... 6 = sábado */
  dias: number[];
  desde: string;                 // 'YYYY-MM-DD'
  hasta: string;                 // 'YYYY-MM-DD'
  horaInicio: string;            // 'HH:mm'
  horaFin: string;               // 'HH:mm'
  duracion: number;              // minutos por turno
  modalidad: ModalidadTurno;
}
