export interface Certificado {
    id?: string | number,
    nombre_certificado: string,
    institucion_certificado: string,
    fecha_obtencion: string,
    descripcion_certificado: string,
    /** Link del archivo adjunto (en Supabase Storage) */
    archivo_adjunto?: string,
    /** Nombre original del archivo adjunto */
    archivo_nombre?: string
}
