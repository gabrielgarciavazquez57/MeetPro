export interface Valoracion {
  id?: string;
  /** ID del profesional valorado */
  professionalId: string;
  /** Nombre del usuario que valora */
  nombre: string;
  /** Apellido del usuario que valora */
  apellido: string;
  /** Fecha de la valoración (yyyy-MM-dd) */
  fecha: string;
  /** Puntaje del 1 al 5 */
  puntaje: number;
  /** Comentario del usuario */
  descripcion: string;
}
