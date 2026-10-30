export type TipoNotificacion =
  | 'turno_reserva'
  | 'turno_solicitud'
  | 'turno_cercano'
  | 'turno_estado'
  | 'mensaje'
  | 'valoracion'
  | 'consulta'
  | 'contenido'
  | 'pago_recibido'
  | 'pago_realizado';

export interface Notificacion {
  id: string;
  user_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  /** Ruta de la app a la que lleva la notificación */
  enlace?: string;
  leida: boolean;
  creada: string;
}
