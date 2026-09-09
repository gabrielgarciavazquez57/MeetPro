import { Profesional } from './profesional';

export interface Turno {
  id?: string;
  fecha: string;                       // 'YYYY-MM-DD'
  hora: string;                        // 'HH:mm'
  profesional: Profesional;
  modalidad: 'online' | 'presencial';
  disponible?: boolean;                // false = ya reservado
}
