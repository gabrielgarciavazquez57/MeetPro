import { Profesional } from './profesional';
import { User } from './user';

export interface Turno {
  id?: string;
  fecha: string;                       // 'YYYY-MM-DD'
  hora: string;                        // 'HH:mm'
  profesional: Profesional;
  modalidad: 'online' | 'presencial';
  disponible?: boolean;                // false = ya reservado
  cliente?: User | null;               // usuario que reservó el turno
}
