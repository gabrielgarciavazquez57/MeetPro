export interface TitulosPro {
    id?: string | number,
    nombre_titulo: string,
    descripcion_titulo: string,
    fecha_obtencion: string,
    institucion_educativa: string,
    /** Link del archivo adjunto (en Supabase Storage) */
    archivo_adjunto?: string,
    /** Nombre original del archivo adjunto */
    archivo_nombre?: string
}
