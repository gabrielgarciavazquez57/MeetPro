import { inject, Injectable } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { Profesional } from '../interfaces/profesional';
import { User } from '../interfaces/user';
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

  /** Copia los datos del usuario (foto incluida) al perfil profesional y a su información ampliada */
  sincronizarDatosUsuario(user: User) {
    const copiar = (tabla: 'profesionales' | 'informacionesProfesionales') =>
      this.db.listarDonde<{ id: string | number }>(tabla, 'profesional_userData->>id', user.id!).pipe(
        switchMap((filas) =>
          filas.length
            ? forkJoin(filas.map((f) => this.db.actualizar(tabla, f.id, { profesional_userData: user })))
            : of([]),
        ),
      );
    return forkJoin([copiar('profesionales'), copiar('informacionesProfesionales')]);
  }
}
