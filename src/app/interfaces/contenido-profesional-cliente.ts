export interface ContenidoProfesionalCliente {
    id?: string | number,
    professionalId: string,
    tipo: 'profesional' | 'cliente',
    titulo: string,
    fecha: string,
    hora: string,
    descripcion: string,
    link: string
}
