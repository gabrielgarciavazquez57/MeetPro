import { inject, Injectable } from '@angular/core';
import { ContenidoProfesionalCliente } from '../interfaces/contenido-profesional-cliente';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientContenido {
  protected readonly db = inject(SupabaseDb);

  ///Se trae todo y se filtra en el componente por professionalId
  getContenido() {
    return this.db.listar<ContenidoProfesionalCliente>('contenido-profesional-cliente');
  }

  addContenido(nuevo_contenido: ContenidoProfesionalCliente) {
    return this.db.insertar<ContenidoProfesionalCliente>('contenido-profesional-cliente', nuevo_contenido);
  }

  updateContenido(id: string | number, contenido_editado: ContenidoProfesionalCliente) {
    return this.db.reemplazar<ContenidoProfesionalCliente>('contenido-profesional-cliente', id, contenido_editado);
  }

  deleteContenido(id: string | number) {
    return this.db.eliminar('contenido-profesional-cliente', id);
  }
}
