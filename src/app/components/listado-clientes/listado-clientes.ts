import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientTicket } from '../../services/client-ticket';
import { Auth } from '../../services/auth';
import { Turno } from '../../interfaces/turno';
import { Ticket } from '../../interfaces/ticket';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import { estadoVisible, formatearFecha, ordenarPorFecha, rangoHorario } from '../../shared/turno-utils';

interface Cliente {
  id: string;
  name: string;
  lastname: string;
  email: string;
  dni?: string;
  phoneNumber?: string;
  turnos: number;
  ultimoTurno?: Turno;
  pagos: number;
  ultimoPago?: string;
  /** Para ordenar: la actividad más reciente (turno o pago) */
  actividad: string;
}

@Component({
  selector: 'app-listado-clientes',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './listado-clientes.html',
  styleUrls: ['../../shared/turnos.css', './listado-clientes.css'],
})
export class ListadoClientes implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientTicket = inject(ClientTicket);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly formatearFecha = formatearFecha;
  protected readonly rangoHorario = rangoHorario;

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly turnos = signal<Turno[]>([]);
  readonly tickets = signal<Ticket[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Ruta del perfil del profesional al que se vuelve */
  readonly rutaPerfil = computed(() => ['/perfil-prof', this.profesional()?.profesional_userData?.id]);

  /** Clientes que contrataron al profesional: pagaron o tienen al menos un turno confirmado o realizado */
  readonly clientes = computed<Cliente[]>(() => {
    const porId = new Map<string, Cliente>();
    const actual = (id: string, base: Pick<Cliente, 'name' | 'lastname' | 'email'>): Cliente => {
      const c = porId.get(id) ?? { id, ...base, turnos: 0, pagos: 0, actividad: '' };
      porId.set(id, c);
      return c;
    };

    for (const t of this.turnos()) {
      const estado = estadoVisible(t);
      if (!t.cliente || (estado !== 'confirmado' && estado !== 'completado')) {
        continue;
      }
      const c = actual(String(t.cliente.id), t.cliente);
      c.dni = t.cliente.dni;
      c.phoneNumber = t.cliente.phoneNumber;
      c.turnos += 1;
      if (!c.ultimoTurno || ordenarPorFecha([c.ultimoTurno, t], true)[0] === t) {
        c.ultimoTurno = t;
      }
    }

    const miId = String(this.profesional()?.profesional_userData?.id);
    for (const p of this.tickets()) {
      if (p.estado !== 'aprobado' || String(p.profesional.id) !== miId) {
        continue;
      }
      const c = actual(String(p.usuario.id), p.usuario);
      c.pagos += 1;
      if (!c.ultimoPago || p.fecha > c.ultimoPago) {
        c.ultimoPago = p.fecha;
      }
    }

    for (const c of porId.values()) {
      const turno = c.ultimoTurno ? `${c.ultimoTurno.fecha}T${c.ultimoTurno.hora}` : '';
      c.actividad = turno > (c.ultimoPago ?? '') ? turno : (c.ultimoPago ?? '');
    }

    return [...porId.values()].sort((a, b) => b.actividad.localeCompare(a.actividad));
  });

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    if (!this.esNavegador) {
      return;
    }

    if (!this.auth.usuario()) {
      this.router.navigate(['/login']);
      return;
    }

    const id = this.profesionalId();
    forkJoin({
      profesionales: this.clientProfesional.getProfesionales(),
      turnos: this.clientTurno.getTurnosDeProfesional(id),
      tickets: this.clientTicket.getTickets(),
    }).subscribe({
      next: ({ profesionales, turnos, tickets }) => {
        const prof = profesionales.find((p) => String(p.professionalId) === String(id)) ?? null;
        if (!prof) {
          this.error.set('No se encontró el profesional.');
          this.cargando.set(false);
          return;
        }
        this.profesional.set(prof);

        if (String(this.auth.usuario()?.id) !== String(prof.profesional_userData?.id)) {
          this.router.navigate(['/perfil-prof', prof.profesional_userData?.id], { replaceUrl: true });
          return;
        }

        this.turnos.set(turnos);
        this.tickets.set(tickets);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer los clientes:', err);
        this.error.set('No se pudo cargar el listado de clientes.');
        this.cargando.set(false);
      },
    });
  }
}
