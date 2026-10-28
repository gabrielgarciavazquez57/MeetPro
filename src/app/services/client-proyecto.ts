import { inject, Injectable } from '@angular/core';
import { Proyecto } from '../interfaces/proyecto';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientProyecto {
  protected readonly db = inject(SupabaseDb);

  getProyectos() {
    return this.db.listar<Proyecto>('proyectos');
  }

  addProyecto(nuevo_proyecto: Proyecto) {
    return this.db.insertar<Proyecto>('proyectos', nuevo_proyecto);
  }

  updateProyecto(id: string | number, proyecto_editado: Proyecto) {
    return this.db.reemplazar<Proyecto>('proyectos', id, proyecto_editado);
  }

  deleteProyecto(id: string | number) {
    return this.db.eliminar('proyectos', id);
  }
}
