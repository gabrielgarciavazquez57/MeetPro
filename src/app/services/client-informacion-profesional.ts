import { inject, Injectable } from '@angular/core';
import { InformacionProfesional } from '../interfaces/informacion-profesional';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientInformacionProfesional {
  protected readonly db = inject(SupabaseDb);

  getInformaciones() {
    return this.db.listar<InformacionProfesional>('informacionesProfesionales');
  }

  getInformacionByProfesional(professionalId: string) {
    return this.db.listarDonde<InformacionProfesional>('informacionesProfesionales', 'professionalId', professionalId);
  }

  addInformacion(nueva_informacion: InformacionProfesional) {
    return this.db.insertar<InformacionProfesional>('informacionesProfesionales', nueva_informacion);
  }

  updateInformacion(id: string | number, informacion_actualizada: InformacionProfesional) {
    return this.db.reemplazar<InformacionProfesional>('informacionesProfesionales', id, informacion_actualizada);
  }
}
