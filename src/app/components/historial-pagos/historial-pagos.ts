import { Component, PLATFORM_ID, computed, inject, signal, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { ClientTicket } from '../../services/client-ticket';
import { Ticket } from '../../interfaces/ticket';
import { BarraNav } from '../barra-nav/barra-nav';

type Modo = 'realizados' | 'recibidos';

@Component({
  selector: 'app-historial-pagos',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './historial-pagos.html',
  styleUrls: ['../../shared/turnos.css', './historial-pagos.css'],
})
export class HistorialPagos implements OnInit {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientTicket = inject(ClientTicket);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** "realizados": lo que el usuario pagó. "recibidos": lo que cobró como profesional */
  readonly modo: Modo = this.route.snapshot.data['modo'] === 'recibidos' ? 'recibidos' : 'realizados';

  readonly tickets = signal<Ticket[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Ruta del perfil al que se vuelve */
  readonly rutaPerfil = computed(() => {
    const id = this.auth.usuario()?.id;
    return this.modo === 'recibidos' ? ['/perfil-prof', id] : ['/perfil-user', id];
  });

  /** Los tickets que corresponden a este modo, del más nuevo al más viejo */
  readonly visibles = computed(() => {
    const yo = String(this.auth.usuario()?.id);
    return this.tickets()
      .filter((t) => String(this.modo === 'recibidos' ? t.profesional.id : t.usuario.id) === yo)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  readonly aprobados = computed(() => this.visibles().filter((t) => t.estado === 'aprobado'));
  readonly total = computed(() => this.aprobados().reduce((suma, t) => suma + t.monto, 0));

  ngOnInit(): void {
    if (!this.esNavegador) {
      return;
    }
    if (!this.auth.usuario()) {
      this.router.navigate(['/login']);
      return;
    }

    this.clientTicket.getTickets().subscribe({
      next: (lista) => {
        this.tickets.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer los pagos:', err);
        this.error.set('No se pudo cargar el historial de pagos.');
        this.cargando.set(false);
      },
    });
  }

  /** La otra parte del pago: el profesional si pagaste, el usuario si cobraste */
  contraparte(t: Ticket): string {
    const p = this.modo === 'recibidos' ? t.usuario : t.profesional;
    return `${p.name} ${p.lastname}`;
  }

  detalle(t: Ticket): string {
    return this.modo === 'recibidos' ? 'Pagó' : t.profesional.profession;
  }

  monto(t: Ticket): string {
    return t.monto.toLocaleString('es-AR', { style: 'currency', currency: t.moneda || 'ARS', minimumFractionDigits: 2 });
  }

  totalTexto(): string {
    return this.total().toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
  }

  fecha(t: Ticket): string {
    return new Date(t.fecha).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
  }

  dia(t: Ticket): string {
    return String(new Date(t.fecha).getDate());
  }

  mes(t: Ticket): string {
    return new Date(t.fecha).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  }
}
