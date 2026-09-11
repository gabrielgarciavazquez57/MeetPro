export interface Proyecto {
    id?: string | number,
    /** ID del profesional dueño del proyecto */
    professionalId: string,
    titulo_proyecto: string,
    fecha_inicio: string,
    fecha_finalizacion: string,
    descripcion_proyecto: string,
    imagen_proyecto: string
}
