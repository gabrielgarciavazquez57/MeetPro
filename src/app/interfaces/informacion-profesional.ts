import { User } from './user';

export interface InformacionProfesional {
  id?: string;
  /** ID del profesional al que pertenece esta información */
  professionalId: string;
  /** Información personal del profesional */
  profesional_userData: User;
  /** Descripción ampliada del profesional */
  descripcionAmpliada: string;
}
