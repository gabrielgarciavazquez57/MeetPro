export interface Consulta {
  id?: string;
  professionalId: string;
  /** Id del usuario que envió la consulta */
  userId: string;
  nombre: string;
  apellido: string;
  email: string;
  titulo: string;
  descripcion: string;
  respuesta?: string;
  fechaRespuesta?: string;
  creada?: string;
}
