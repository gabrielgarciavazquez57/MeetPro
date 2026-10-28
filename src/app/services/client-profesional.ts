import { inject, Injectable } from '@angular/core';
import { Profesional } from '../interfaces/profesional';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientProfesional {
  protected readonly db = inject(SupabaseDb);

  getProfesionales() {
    return this.db.listar<Profesional>('profesionales');
  }

  getProfesionalByUserID(userId: string | number) {
    return this.db.listarDonde<Profesional>('profesionales', 'profesional_userData->>id', userId);
  }

  addProfesional(new_profesional: Profesional) {
    return this.db.insertar<Profesional>('profesionales', new_profesional);
  }

  updateProfesional(id_bus: string | number, updated_profesional: Profesional) {
    return this.db.reemplazar<Profesional>('profesionales', id_bus, updated_profesional);
  }

  deleteProfesional(id_bus: string | number) {
    return this.db.eliminar('profesionales', id_bus);
  }
}
