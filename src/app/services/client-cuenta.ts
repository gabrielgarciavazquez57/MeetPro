import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { User } from '../interfaces/user';
import { Profesional } from '../interfaces/profesional';
import { Turno } from '../interfaces/turno';
import { Valoracion } from '../interfaces/valoracion';
import { InformacionProfesional } from '../interfaces/informacion-profesional';
import { Proyecto } from '../interfaces/proyecto';
import { ContenidoProfesionalCliente } from '../interfaces/contenido-profesional-cliente';
import { SupabaseDb, Tabla } from './supabase-db';

/** Cantidad de registros borrados de cada colección */
export interface ResumenEliminacion {
  perfiles: number;
  turnos: number;
  valoraciones: number;
  informaciones: number;
  proyectos: number;
  contenido: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClientCuenta {
  private readonly db = inject(SupabaseDb);

  /**
   * Elimina un usuario junto con todos los datos relacionados:
   * su perfil profesional y lo que cuelga de él (turnos, valoraciones recibidas, información ampliada,
   * proyectos, contenido), y lo que hizo como cliente (turnos reservados, valoraciones escritas,
   * contenido que le dirigieron). La cuenta se borra al final, así un fallo se puede reintentar.
   */
  eliminarCuenta(usuario: User): Observable<ResumenEliminacion> {
    return forkJoin({
      perfiles: this.db.listar<Profesional>('profesionales'),
      turnos: this.db.listar<Turno>('turnos'),
      valoraciones: this.db.listar<Valoracion>('valoraciones'),
      informaciones: this.db.listar<InformacionProfesional>('informacionesProfesionales'),
      proyectos: this.db.listar<Proyecto>('proyectos'),
      contenido: this.db.listar<ContenidoProfesionalCliente>('contenido-profesional-cliente'),
    }).pipe(
      switchMap((datos) => {
        const uid = String(usuario.id);

        const perfiles = datos.perfiles.filter((p) => String(p.profesional_userData?.id) === uid);
        const matriculas = new Set(perfiles.map((p) => String(p.professionalId)));
        const esSuyo = (professionalId: string) => matriculas.has(String(professionalId));

        const aBorrar = {
          perfiles: perfiles.map((p) => p.id),
          turnos: datos.turnos
            .filter((t) => esSuyo(t.professionalId) || (t.cliente != null && String(t.cliente.id) === uid))
            .map((t) => t.id),
          valoraciones: datos.valoraciones
            .filter(
              (v) =>
                esSuyo(v.professionalId) ||
                (v.userId != null ? String(v.userId) === uid : this.mismoNombre(v, usuario)),
            )
            .map((v) => v.id),
          informaciones: datos.informaciones.filter((i) => esSuyo(i.professionalId)).map((i) => i.id),
          proyectos: datos.proyectos.filter((p) => esSuyo(p.professionalId)).map((p) => p.id),
          contenido: datos.contenido
            .filter((c) => esSuyo(c.professionalId) || (!!usuario.dni && c.dniCliente === usuario.dni))
            .map((c) => c.id),
        };

        // Primero lo que cuelga del perfil profesional, después el perfil y al final el usuario:
        // las políticas de acceso dependen de que el perfil siga existiendo mientras se borra lo demás
        const dependientes = [
          ...this.borrar('turnos', aBorrar.turnos),
          ...this.borrar('valoraciones', aBorrar.valoraciones),
          ...this.borrar('informacionesProfesionales', aBorrar.informaciones),
          ...this.borrar('proyectos', aBorrar.proyectos),
          ...this.borrar('contenido-profesional-cliente', aBorrar.contenido),
        ];
        const borradoPerfiles = this.borrar('profesionales', aBorrar.perfiles);

        const dependientes$ = dependientes.length ? forkJoin(dependientes) : of([]);
        const perfiles$ = borradoPerfiles.length ? forkJoin(borradoPerfiles) : of([]);

        return dependientes$.pipe(
          switchMap(() => perfiles$),
          switchMap(() => this.db.eliminar('users', usuario.id!)),
          map(() => ({
            perfiles: aBorrar.perfiles.length,
            turnos: aBorrar.turnos.length,
            valoraciones: aBorrar.valoraciones.length,
            informaciones: aBorrar.informaciones.length,
            proyectos: aBorrar.proyectos.length,
            contenido: aBorrar.contenido.length,
          })),
        );
      }),
    );
  }

  /** Valoraciones viejas no guardaban el userId: se reconocen por nombre y apellido */
  private mismoNombre(v: Valoracion, u: User): boolean {
    const igual = (a: string | undefined, b: string | undefined) =>
      (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
    return igual(v.nombre, u.name) && igual(v.apellido, u.lastname);
  }

  private borrar(coleccion: Tabla, ids: (string | number | undefined)[]): Observable<unknown>[] {
    return ids
      .filter((id): id is string | number => id != null)
      .map((id) => this.db.eliminar(coleccion, id));
  }
}
