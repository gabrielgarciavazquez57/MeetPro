import { inject, Injectable } from '@angular/core';
import { Valoracion } from '../interfaces/valoracion';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientValoracion {
  protected readonly db = inject(SupabaseDb);

  getValoraciones() {
    return this.db.listar<Valoracion>('valoraciones');
  }

  getValoracionesByProfesional(professionalId: string) {
    return this.db.listarDonde<Valoracion>('valoraciones', 'professionalId', professionalId);
  }

  addValoracion(nueva_valoracion: Valoracion) {
    return this.db.insertar<Valoracion>('valoraciones', nueva_valoracion);
  }

  deleteValoracion(id: string | number) {
    return this.db.eliminar('valoraciones', id);
  }
}
