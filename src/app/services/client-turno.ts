import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { ConfigDisponibilidad, Turno } from '../interfaces/turno';
import { User } from '../interfaces/user';
import { SupabaseDb } from './supabase-db';
import { aClienteTurno, haComenzado, horariosNuevos, seSuperponen } from '../shared/turno-utils';

@Injectable({
  providedIn: 'root',
})
export class ClientTurno {
  protected readonly db = inject(SupabaseDb);

  // ===== CRUD =====
  getTurnos() {
    return this.db.listar<Turno>('turnos');
  }

  getTurnoById(id: string | number) {
    return this.db.obtener<Turno>('turnos', id);
  }

  addTurno(nuevo_turno: Turno) {
    return this.db.insertar<Turno>('turnos', nuevo_turno);
  }

  updateTurno(id: string | number, turno_editado: Turno) {
    return this.db.reemplazar<Turno>('turnos', id, turno_editado);
  }

  patchTurno(id: string | number, cambios: Partial<Turno>) {
    return this.db.actualizar<Turno>('turnos', id, cambios);
  }

  deleteTurno(id: string | number) {
    return this.db.eliminar('turnos', id);
  }

  // ===== Consultas =====
  // Se trae todo y se filtra acá con String().
  getTurnosDeProfesional(professionalId: string): Observable<Turno[]> {
    return this.getTurnos().pipe(
      map((lista) => lista.filter((t) => String(t.professionalId) === String(professionalId))),
    );
  }

  getTurnosDeCliente(userId: string | number): Observable<Turno[]> {
    return this.getTurnos().pipe(
      map((lista) => lista.filter((t) => t.cliente != null && String(t.cliente.id) === String(userId))),
    );
  }

  // ===== Flujo del cliente =====
  /** Solicita un turno libre. Falla con 'NO_DISPONIBLE' o 'CHOQUE_HORARIO' */
  reservar(turnoId: string, cliente: User, motivo: string): Observable<Turno> {
    return forkJoin({ turno: this.getTurnoById(turnoId), todos: this.getTurnos() }).pipe(
      switchMap(({ turno, todos }) => {
        if (turno.estado !== 'disponible' || haComenzado(turno)) {
          return throwError(() => new Error('NO_DISPONIBLE'));
        }

        const choque = todos.some(
          (t) =>
            t.id !== turno.id &&
            t.cliente != null &&
            String(t.cliente.id) === String(cliente.id) &&
            (t.estado === 'pendiente' || t.estado === 'confirmado') &&
            seSuperponen(t, turno),
        );
        if (choque) {
          return throwError(() => new Error('CHOQUE_HORARIO'));
        }

        return this.patchTurno(turnoId, {
          estado: 'pendiente',
          cliente: aClienteTurno(cliente),
          motivo,
        });
      }),
    );
  }

  // ===== Flujo del profesional =====
  /** Confirma una solicitud pendiente. Falla con 'ESTADO_CAMBIO' si el cliente ya la canceló */
  confirmar(turno: Turno, nota: string, enlace: string): Observable<Turno> {
    return this.getTurnoById(turno.id!).pipe(
      switchMap((actual) => {
        if (actual.estado !== 'pendiente') {
          return throwError(() => new Error('ESTADO_CAMBIO'));
        }
        return this.patchTurno(turno.id!, {
          estado: 'confirmado',
          notaProfesional: nota.trim(),
          enlaceReunion: turno.modalidad === 'online' ? enlace.trim() : '',
        });
      }),
    );
  }

  cerrar(turno: Turno, estado: 'completado' | 'ausente'): Observable<Turno> {
    return this.patchTurno(turno.id!, { estado });
  }

  /**
   * Cancela (o rechaza) un turno conservando el registro para el historial.
   * Si lo cancela el cliente antes de que empiece, el horario vuelve a quedar libre.
   */
  cancelar(
    turno: Turno,
    por: 'cliente' | 'profesional',
    motivo: string,
    estadoFinal: 'cancelado' | 'rechazado' = 'cancelado',
  ): Observable<unknown> {
    const cerrado$ = this.patchTurno(turno.id!, {
      estado: estadoFinal,
      canceladoPor: por,
      motivoCancelacion: motivo.trim(),
    });

    if (por !== 'cliente' || haComenzado(turno)) {
      return cerrado$;
    }

    const libre: Turno = {
      professionalId: turno.professionalId,
      fecha: turno.fecha,
      hora: turno.hora,
      duracion: turno.duracion,
      modalidad: turno.modalidad,
      estado: 'disponible',
      cliente: null,
    };
    return cerrado$.pipe(switchMap(() => this.addTurno(libre)));
  }

  // ===== Disponibilidad =====
  /** Crea en lote los horarios de la configuración. Devuelve cuántos se crearon */
  generarDisponibilidad(professionalId: string, cfg: ConfigDisponibilidad): Observable<number> {
    return this.getTurnosDeProfesional(professionalId).pipe(
      switchMap((existentes) => {
        const nuevos = horariosNuevos(cfg, existentes);
        if (!nuevos.length) {
          return of(0);
        }

        const altas = nuevos.map((h) =>
          this.addTurno({
            professionalId,
            fecha: h.fecha,
            hora: h.hora,
            duracion: cfg.duracion,
            modalidad: cfg.modalidad,
            estado: 'disponible',
            cliente: null,
          }),
        );
        return forkJoin(altas).pipe(map((creados) => creados.length));
      }),
    );
  }

  eliminarTurnos(ids: string[]): Observable<unknown> {
    return ids.length ? forkJoin(ids.map((id) => this.deleteTurno(id))) : of(null);
  }
}
