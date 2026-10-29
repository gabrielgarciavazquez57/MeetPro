import { Component, PLATFORM_ID, computed, inject, signal, OnInit } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { NotificacionesService } from '../../services/notificaciones';
import { Notificacion, TipoNotificacion } from '../../interfaces/notificacion';
import { BarraNav } from '../barra-nav/barra-nav';

type Pestana = 'todas' | 'noleidas';

const ETIQUETAS: Record<TipoNotificacion, string> = {
  turno_reserva: 'Turno',
  turno_solicitud: 'Solicitud',
  turno_cercano: 'Recordatorio',
  turno_estado: 'Estado del turno',
  mensaje: 'Mensaje',
  valoracion: 'Valoración',
  consulta: 'Consulta',
  contenido: 'Contenido',
};

@Component({
  selector: 'app-lista-notificaciones',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './lista-notificaciones.html',
  styleUrls: ['../../shared/turnos.css', './lista-notificaciones.css'],
})
export class ListaNotificaciones implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly servicio = inject(NotificacionesService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly cargando = this.servicio.cargando;
  readonly noLeidas = this.servicio.noLeidas;
  readonly pestana = signal<Pestana>('todas');

  readonly visibles = computed(() =>
    this.pestana() === 'noleidas' ? this.servicio.items().filter((n) => !n.leida) : this.servicio.items(),
  );
  readonly total = computed(() => this.servicio.items().length);

  ngOnInit(): void {
    if (!this.esNavegador) {
      return;
    }
    if (!this.auth.usuario()) {
      this.router.navigate(['/login']);
      return;
    }
    this.servicio.actualizar();
  }

  irA(pestana: Pestana): void {
    this.pestana.set(pestana);
  }

  etiqueta(n: Notificacion): string {
    return ETIQUETAS[n.tipo] ?? 'Aviso';
  }

  abrir(n: Notificacion): void {
    this.servicio.marcarLeida(n);
    if (n.enlace) {
      this.router.navigateByUrl(n.enlace);
    }
  }

  marcarLeida(n: Notificacion): void {
    this.servicio.marcarLeida(n);
  }

  marcarTodas(): void {
    this.servicio.marcarTodasLeidas();
  }

  eliminar(n: Notificacion): void {
    this.servicio.eliminar(n);
  }

  volver(): void {
    this.location.back();
  }

  dia(n: Notificacion): string {
    return String(new Date(n.creada).getDate());
  }

  mes(n: Notificacion): string {
    return new Date(n.creada).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  }

  /** "hace 5 min", "hace 3 h", "ayer" o la fecha */
  hace(n: Notificacion): string {
    const minutos = Math.floor((Date.now() - new Date(n.creada).getTime()) / 60000);
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    return new Date(n.creada).toLocaleDateString('es-AR');
  }
}
