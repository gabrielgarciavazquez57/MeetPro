import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientValoracion } from '../../services/client-valoracion';
import { Auth } from '../../services/auth';
import { Turno } from '../../interfaces/turno';
import { Profesional } from '../../interfaces/profesional';
import { Valoracion } from '../../interfaces/valoracion';
import { BarraNav } from '../barra-nav/barra-nav';
import { estadoVisible, formatearFecha, ordenarPorFecha, rangoHorario } from '../../shared/turno-utils';

interface Consultado {
  professionalId: string;
  profesional: Profesional | undefined;
  consultas: number;
  ultima: Turno;
}

@Component({
  selector: 'app-profesionales-consultados',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './profesionales-consultados.html',
  styleUrls: ['../../shared/turnos.css', './profesionales-consultados.css'],
})
export class ProfesionalesConsultados implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientValoracion = inject(ClientValoracion);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly formatearFecha = formatearFecha;
  protected readonly rangoHorario = rangoHorario;

  readonly userId = signal<string>('');
  readonly turnos = signal<Turno[]>([]);
  readonly profesionales = signal<Profesional[]>([]);
  readonly valoraciones = signal<Valoracion[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Profesionales con los que el usuario ya tuvo al menos una consulta realizada */
  readonly consultados = computed<Consultado[]>(() => {
    const porMatricula = new Map(this.profesionales().map((p) => [String(p.professionalId), p] as const));
    const grupos = new Map<string, Turno[]>();

    for (const t of this.turnos()) {
      if (estadoVisible(t) !== 'completado') {
        continue;
      }
      const clave = String(t.professionalId);
      grupos.set(clave, [...(grupos.get(clave) ?? []), t]);
    }

    const lista = [...grupos].map(([professionalId, realizados]) => ({
      professionalId,
      profesional: porMatricula.get(professionalId),
      consultas: realizados.length,
      ultima: ordenarPorFecha(realizados, true)[0],
    }));

    return lista.sort((a, b) =>
      (b.ultima.fecha + b.ultima.hora).localeCompare(a.ultima.fecha + a.ultima.hora),
    );
  });

  /** Promedio de puntaje por professionalId (0 si no tiene valoraciones) */
  readonly promedios = computed(() => {
    const acumulado = new Map<string, { suma: number; total: number }>();
    for (const v of this.valoraciones()) {
      const key = String(v.professionalId);
      const actual = acumulado.get(key) ?? { suma: 0, total: 0 };
      actual.suma += v.puntaje ?? 0;
      actual.total += 1;
      acumulado.set(key, actual);
    }
    const mapa = new Map<string, number>();
    for (const [key, { suma, total }] of acumulado) {
      mapa.set(key, Math.round((suma / total) * 10) / 10);
    }
    return mapa;
  });

  promedioDe(professionalId: string | undefined): number {
    return this.promedios().get(String(professionalId)) ?? 0;
  }

  ngOnInit(): void {
    this.userId.set(this.route.snapshot.paramMap.get('userId') ?? '');
    if (!this.esNavegador) {
      return;
    }

    const logueado = this.auth.usuario();
    if (!logueado) {
      this.router.navigate(['/login']);
      return;
    }
    if (String(logueado.id) !== this.userId()) {
      this.router.navigate(['/profesionales-consultados', logueado.id], { replaceUrl: true });
      return;
    }

    this.clientValoracion.getValoraciones().subscribe({
      next: (data) => this.valoraciones.set(data),
      error: (err) => console.error('Error al traer valoraciones:', err),
    });

    forkJoin({
      turnos: this.clientTurno.getTurnosDeCliente(this.userId()),
      profesionales: this.clientProfesional.getProfesionales(),
    }).subscribe({
      next: ({ turnos, profesionales }) => {
        this.turnos.set(turnos);
        this.profesionales.set(profesionales);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer los turnos:', err);
        this.error.set('No se pudieron cargar los profesionales.');
        this.cargando.set(false);
      },
    });
  }
}
