export interface Certificado {
    id?: string | number,
    nombre_certificado: string,
    institucion_certificado: string,
    fecha_obtencion: string,
    descripcion_certificado: string,
    archivo_adjunto?: string
}
