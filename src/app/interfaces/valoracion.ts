export interface Valoracion {
  id?: string;
  /** ID del profesional valorado */
  professionalId: string;
  /** ID del usuario que valora (para saber quién puede editar/eliminar) */
  userId?: string | number;
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
