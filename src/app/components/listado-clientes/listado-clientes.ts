import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { Auth } from '../../services/auth';
import { ClienteTurno, Turno } from '../../interfaces/turno';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import { estadoVisible, formatearFecha, ordenarPorFecha, rangoHorario } from '../../shared/turno-utils';

interface Cliente {
  datos: ClienteTurno;
  turnos: number;
  ultimo: Turno;
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly formatearFecha = formatearFecha;
  protected readonly rangoHorario = rangoHorario;

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly turnos = signal<Turno[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Ruta del perfil del profesional al que se vuelve */
  readonly rutaPerfil = computed(() => ['/perfil-prof', this.profesional()?.profesional_userData?.id]);

  /** Clientes que contrataron al profesional: tienen al menos un turno confirmado o realizado */
  readonly clientes = computed<Cliente[]>(() => {
    const grupos = new Map<string, Turno[]>();

    for (const t of this.turnos()) {
      const estado = estadoVisible(t);
      if (!t.cliente || (estado !== 'confirmado' && estado !== 'completado')) {
        continue;
      }
      const clave = String(t.cliente.id);
      grupos.set(clave, [...(grupos.get(clave) ?? []), t]);
    }

    const lista = [...grupos.values()].map((turnos) => {
      const ultimo = ordenarPorFecha(turnos, true)[0];
      return { datos: ultimo.cliente as ClienteTurno, turnos: turnos.length, ultimo };
    });

    return lista.sort((a, b) =>
      (b.ultimo.fecha + b.ultimo.hora).localeCompare(a.ultimo.fecha + a.ultimo.hora),
    );
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
    }).subscribe({
      next: ({ profesionales, turnos }) => {
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
