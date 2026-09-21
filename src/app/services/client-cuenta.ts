import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { User } from '../interfaces/user';
import { Profesional } from '../interfaces/profesional';
import { Turno } from '../interfaces/turno';
import { Valoracion } from '../interfaces/valoracion';
import { InformacionProfesional } from '../interfaces/informacion-profesional';
import { Proyecto } from '../interfaces/proyecto';
import { ContenidoProfesionalCliente } from '../interfaces/contenido-profesional-cliente';

const API = 'http://localhost:3000';

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
  private readonly http = inject(HttpClient);

  /**
   * Elimina un usuario junto con todos los datos relacionados:
   * su perfil profesional y lo que cuelga de él (turnos, valoraciones recibidas, información ampliada,
   * proyectos, contenido), y lo que hizo como cliente (turnos reservados, valoraciones escritas,
   * contenido que le dirigieron). La cuenta se borra al final, así un fallo se puede reintentar.
   */
  eliminarCuenta(usuario: User): Observable<ResumenEliminacion> {
    // Se trae todo y se filtra acá: json-server compara "parecido a número" como Number en los filtros por query
    return forkJoin({
      perfiles: this.http.get<Profesional[]>(`${API}/profesionales`),
      turnos: this.http.get<Turno[]>(`${API}/turnos`),
      valoraciones: this.http.get<Valoracion[]>(`${API}/valoraciones`),
      informaciones: this.http.get<InformacionProfesional[]>(`${API}/informacionesProfesionales`),
      proyectos: this.http.get<Proyecto[]>(`${API}/proyectos`),
      contenido: this.http.get<ContenidoProfesionalCliente[]>(`${API}/contenido-profesional-cliente`),
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

        const borrados = [
          ...this.borrar('profesionales', aBorrar.perfiles),
          ...this.borrar('turnos', aBorrar.turnos),
          ...this.borrar('valoraciones', aBorrar.valoraciones),
          ...this.borrar('informacionesProfesionales', aBorrar.informaciones),
          ...this.borrar('proyectos', aBorrar.proyectos),
          ...this.borrar('contenido-profesional-cliente', aBorrar.contenido),
        ];

        const relacionados$ = borrados.length ? forkJoin(borrados) : of([]);

        return relacionados$.pipe(
          switchMap(() => this.http.delete(`${API}/users/${usuario.id}`)),
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

  private borrar(coleccion: string, ids: (string | number | undefined)[]): Observable<unknown>[] {
    return ids
      .filter((id): id is string | number => id != null)
      .map((id) => this.http.delete(`${API}/${coleccion}/${id}`));
  }
}
