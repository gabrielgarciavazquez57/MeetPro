import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, of, switchMap } from 'rxjs';
import { Notificacion } from '../interfaces/notificacion';
import { Auth } from './auth';
import { SupabaseDb } from './supabase-db';

const INTERVALO_MS = 60_000;

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private readonly db = inject(SupabaseDb);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly items = signal<Notificacion[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly noLeidas = computed(() => this.items().filter((n) => !n.leida).length);

  private temporizador: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (!this.esNavegador) {
      return;
    }
    // Al iniciar o cerrar sesión se reinicia la carga; mientras haya sesión se actualiza cada minuto
    effect(() => {
      const usuario = this.auth.usuario();
      untracked(() => {
        this.detener();
        if (!usuario) {
          this.items.set([]);
          return;
        }
        this.actualizar();
        this.temporizador = setInterval(() => this.actualizar(), INTERVALO_MS);
      });
    });
  }

  /** Genera los recordatorios pendientes y trae las notificaciones del usuario */
  actualizar(): void {
    this.cargando.set(true);
    this.db
      .rpc<unknown>('generar_recordatorios', {})
      .pipe(
        catchError(() => of(null)),
        switchMap(() => this.db.listar<Notificacion>('notificaciones')),
      )
      .subscribe({
        next: (lista) => {
          this.items.set([...lista].sort((a, b) => b.creada.localeCompare(a.creada)));
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  marcarLeida(n: Notificacion): void {
    if (n.leida) {
      return;
    }
    this.items.update((lista) => lista.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    this.db.actualizar('notificaciones', n.id, { leida: true }).subscribe({ error: () => this.actualizar() });
  }

  marcarTodasLeidas(): void {
    this.items.update((lista) => lista.map((x) => ({ ...x, leida: true })));
    this.db.rpc<unknown>('marcar_todas_leidas', {}).subscribe({ error: () => this.actualizar() });
  }

  eliminar(n: Notificacion): void {
    this.items.update((lista) => lista.filter((x) => x.id !== n.id));
    this.db.eliminar('notificaciones', n.id).subscribe({ error: () => this.actualizar() });
  }

  private detener(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }
}
