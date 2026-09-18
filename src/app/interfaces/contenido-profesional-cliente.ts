export interface ContenidoProfesionalCliente {
    id?: string | number,
    professionalId: string,
    tipo: 'profesional' | 'cliente',
    /** DNI del cliente al que va dirigido (solo contenido tipo 'profesional'): si se completa, solo ese cliente lo ve */
    dniCliente?: string,
    titulo: string,
    fecha: string,
    hora: string,
    descripcion: string,
    link: string
}
