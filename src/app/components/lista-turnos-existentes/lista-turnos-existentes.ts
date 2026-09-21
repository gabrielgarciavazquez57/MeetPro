import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { Auth } from '../../services/auth';
import { Turno } from '../../interfaces/turno';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import {
  diaDelMes,
  esActivo,
  estadoVisible,
  ETIQUETAS_ESTADO,
  etiquetaDia,
  formatearFecha,
  mesCorto,
  ordenarPorFecha,
  rangoHorario,
} from '../../shared/turno-utils';

type Pestana = 'proximos' | 'historial';
type TipoAccion = 'cancelar' | 'reprogramar';

@Component({
  selector: 'app-lista-turnos-existentes',
  standalone: true,
  imports: [BarraNav, RouterLink, FormsModule],
  templateUrl: './lista-turnos-existentes.html',
  styleUrls: ['../../shared/turnos.css', './lista-turnos-existentes.css'],
})
export class ListaTurnosExistentes implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly formatearFecha = formatearFecha;
  protected readonly rangoHorario = rangoHorario;
  protected readonly diaDelMes = diaDelMes;
  protected readonly mesCorto = mesCorto;
  protected readonly etiquetaDia = etiquetaDia;
  protected readonly estadoVisible = estadoVisible;
  protected readonly etiquetas = ETIQUETAS_ESTADO;

  readonly userId = signal<string>('');
  readonly turnos = signal<Turno[]>([]);
  readonly profesionales = signal<Profesional[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly pestana = signal<Pestana>('proximos');
  readonly accion = signal<{ id: string; tipo: TipoAccion } | null>(null);
  readonly motivo = signal<string>('');
  readonly procesando = signal<boolean>(false);

  private readonly profesionalesPorMatricula = computed(
    () => new Map(this.profesionales().map((p) => [String(p.professionalId), p] as const)),
  );

  /** Turnos pendientes o confirmados que todavía no pasaron */
  readonly proximos = computed(() => ordenarPorFecha(this.turnos().filter(esActivo)));

  /** Todo lo demás: realizados, cancelados, rechazados, vencidos */
  readonly historial = computed(() => ordenarPorFecha(this.turnos().filter((t) => !esActivo(t)), true));

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
      this.router.navigate(['/turnos-existentes', logueado.id], { replaceUrl: true });
      return;
    }

    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      turnos: this.clientTurno.getTurnosDeCliente(this.userId()),
      profesionales: this.clientProfesional.getProfesionales(),
    }).subscribe({
      next: ({ turnos, profesionales }) => {
        this.turnos.set(turnos);
        this.profesionales.set(profesionales);
        this.pestana.set(this.proximos().length || !this.historial().length ? 'proximos' : 'historial');
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer los turnos:', err);
        this.error.set('No se pudieron cargar los turnos.');
        this.cargando.set(false);
      },
    });
  }

  private recargar(): void {
    this.clientTurno.getTurnosDeCliente(this.userId()).subscribe({
      next: (turnos) => this.turnos.set(turnos),
    });
  }

  profesionalDe(turno: Turno): Profesional | undefined {
    return this.profesionalesPorMatricula().get(String(turno.professionalId));
  }

  nombreProfesional(turno: Turno): string {
    const u = this.profesionalDe(turno)?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : 'Profesional';
  }

  irA(pestana: Pestana): void {
    this.pestana.set(pestana);
    this.accion.set(null);
  }

  abrirAccion(turno: Turno, tipo: TipoAccion): void {
    this.accion.set({ id: turno.id!, tipo });
    this.motivo.set('');
  }

  cerrarAccion(): void {
    this.accion.set(null);
  }

  ejecutarAccion(turno: Turno): void {
    const actual = this.accion();
    if (!actual || actual.id !== turno.id) {
      return;
    }

    this.procesando.set(true);
    const peticion$: Observable<unknown> = this.clientTurno.cancelar(turno, 'cliente', this.motivo());

    peticion$.subscribe({
      next: () => {
        this.procesando.set(false);
        this.accion.set(null);
        if (actual.tipo === 'reprogramar') {
          this.router.navigate(['/turnos', turno.professionalId]);
        } else {
          this.recargar();
        }
      },
      error: () => {
        this.procesando.set(false);
        alert('No se pudo cancelar el turno. Intentá de nuevo.');
      },
    });
  }
}
