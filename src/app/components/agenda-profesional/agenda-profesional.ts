import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { Auth } from '../../services/auth';
import { ConfigDisponibilidad, ModalidadTurno, Turno } from '../../interfaces/turno';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import {
  agruparPorDia,
  calcularHorarios,
  diaDelMes,
  DURACIONES,
  estadoVisible,
  ETIQUETAS_ESTADO,
  etiquetaDia,
  formatearFecha,
  haComenzado,
  haTerminado,
  hoyISO,
  horariosNuevos,
  MAX_HORARIOS,
  mesCorto,
  ordenarPorFecha,
  rangoHorario,
  sumarDias,
} from '../../shared/turno-utils';

type Pestana = 'solicitudes' | 'agenda' | 'disponibilidad' | 'historial';
type TipoAccion = 'confirmar' | 'rechazar' | 'cancelar';

@Component({
  selector: 'app-agenda-profesional',
  standalone: true,
  imports: [BarraNav, RouterLink, FormsModule, ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './agenda-profesional.html',
  styleUrls: ['../../shared/turnos.css', './agenda-profesional.css'],
})
export class AgendaProfesional implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly formatearFecha = formatearFecha;
  protected readonly rangoHorario = rangoHorario;
  protected readonly diaDelMes = diaDelMes;
  protected readonly mesCorto = mesCorto;
  protected readonly etiquetaDia = etiquetaDia;
  protected readonly estadoVisible = estadoVisible;
  protected readonly etiquetas = ETIQUETAS_ESTADO;
  protected readonly duraciones = DURACIONES;
  protected readonly hoy = hoyISO();
  protected readonly diasChips = [
    { n: 1, l: 'Lun' },
    { n: 2, l: 'Mar' },
    { n: 3, l: 'Mié' },
    { n: 4, l: 'Jue' },
    { n: 5, l: 'Vie' },
    { n: 6, l: 'Sáb' },
    { n: 0, l: 'Dom' },
  ];

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly turnos = signal<Turno[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly pestana = signal<Pestana>('solicitudes');
  readonly procesando = signal<boolean>(false);
  readonly limiteHistorial = signal<number>(20);

  // ===== Acción inline (confirmar / rechazar / cancelar) =====
  readonly accion = signal<{ id: string; tipo: TipoAccion } | null>(null);
  readonly nota = signal<string>('');
  readonly enlace = signal<string>('');
  readonly motivoAccion = signal<string>('');

  // ===== Generador de disponibilidad =====
  protected readonly formDisp = this.fb.nonNullable.group({
    desde: [hoyISO()],
    hasta: [sumarDias(hoyISO(), 28)],
    horaInicio: ['09:00'],
    horaFin: ['13:00'],
    duracion: [30],
    modalidad: ['presencial' as ModalidadTurno],
  });
  private readonly valoresForm = toSignal(this.formDisp.valueChanges, {
    initialValue: this.formDisp.getRawValue(),
  });
  readonly diasElegidos = signal<number[]>([1, 2, 3, 4, 5]);
  readonly mensajeGenerador = signal<string>('');

  // ===== Datos derivados =====
  readonly usuarioProfesional = computed(() => this.profesional()?.profesional_userData ?? null);

  readonly nombreProfesional = computed(() => {
    const u = this.usuarioProfesional();
    return u ? `${u.name} ${u.lastname}` : '';
  });

  readonly profesionalUsuarioId = computed(() => this.usuarioProfesional()?.id ?? null);

  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const dueno = this.usuarioProfesional();
    return !!logueado && !!dueno && String(logueado.id) === String(dueno.id);
  });

  /** Solicitudes que esperan respuesta */
  readonly pendientes = computed(() =>
    ordenarPorFecha(this.turnos().filter((t) => t.estado === 'pendiente' && t.cliente && !haComenzado(t))),
  );

  /** Turnos confirmados que todavía no terminaron */
  readonly proximos = computed(() =>
    ordenarPorFecha(this.turnos().filter((t) => t.estado === 'confirmado' && t.cliente && !haTerminado(t))),
  );

  readonly agendaPorDia = computed(() => agruparPorDia(this.proximos()));

  /** Confirmados que ya pasaron y todavía no se marcaron como realizados / ausentes */
  readonly porCerrar = computed(() =>
    ordenarPorFecha(this.turnos().filter((t) => t.estado === 'confirmado' && t.cliente && haTerminado(t)), true),
  );

  readonly turnosHoy = computed(() => this.proximos().filter((t) => t.fecha === hoyISO()).length);

  readonly libres = computed(() =>
    ordenarPorFecha(this.turnos().filter((t) => t.estado === 'disponible' && !haComenzado(t))),
  );

  readonly libresPorDia = computed(() => agruparPorDia(this.libres()));

  readonly historial = computed(() =>
    ordenarPorFecha(
      this.turnos().filter(
        (t) =>
          t.estado === 'rechazado' ||
          t.estado === 'cancelado' ||
          t.estado === 'completado' ||
          t.estado === 'ausente' ||
          (t.estado === 'pendiente' && haComenzado(t)),
      ),
      true,
    ),
  );

  readonly historialVisible = computed(() => this.historial().slice(0, this.limiteHistorial()));

  // ===== Generador: configuración, vista previa y validación =====
  readonly configuracion = computed<ConfigDisponibilidad>(() => {
    const v = this.valoresForm();
    return {
      dias: this.diasElegidos(),
      desde: v.desde ?? '',
      hasta: v.hasta ?? '',
      horaInicio: v.horaInicio ?? '',
      horaFin: v.horaFin ?? '',
      duracion: Number(v.duracion ?? 30),
      modalidad: v.modalidad ?? 'presencial',
    };
  });

  readonly nuevosPrevistos = computed(() => horariosNuevos(this.configuracion(), this.turnos()));

  readonly errorGenerador = computed<string | null>(() => {
    const cfg = this.configuracion();
    if (!cfg.dias.length) {
      return 'Elegí al menos un día de la semana.';
    }
    if (!cfg.desde || !cfg.hasta) {
      return 'Completá el rango de fechas.';
    }
    if (cfg.hasta < cfg.desde) {
      return 'La fecha final no puede ser anterior a la inicial.';
    }
    if (cfg.hasta < hoyISO()) {
      return 'El rango tiene que incluir fechas futuras.';
    }
    if (!cfg.horaInicio || !cfg.horaFin || cfg.horaFin <= cfg.horaInicio) {
      return 'La hora de fin tiene que ser posterior a la de inicio.';
    }
    if (calcularHorarios(cfg).length > MAX_HORARIOS) {
      return `Son demasiados horarios (máximo ${MAX_HORARIOS} por vez). Acortá el rango de fechas.`;
    }
    if (this.nuevosPrevistos().length === 0) {
      return 'Con esa configuración no se crea ningún horario nuevo (ya existen o son del pasado).';
    }
    return null;
  });

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    if (!this.esNavegador) {
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    const id = this.profesionalId();
    this.cargando.set(true);
    this.error.set(null);

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

        if (!this.esDueno()) {
          this.router.navigate(['/turnos', id], { replaceUrl: true });
          return;
        }

        this.turnos.set(turnos);
        this.pestana.set(this.pendientes().length ? 'solicitudes' : 'agenda');
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer la agenda:', err);
        this.error.set('No se pudo cargar la agenda.');
        this.cargando.set(false);
      },
    });
  }

  private recargar(): void {
    this.clientTurno.getTurnosDeProfesional(this.profesionalId()).subscribe({
      next: (turnos) => this.turnos.set(turnos),
    });
  }

  irA(pestana: Pestana): void {
    this.pestana.set(pestana);
    this.accion.set(null);
  }

  // ===== Acciones sobre turnos =====
  abrirAccion(turno: Turno, tipo: TipoAccion): void {
    this.accion.set({ id: turno.id!, tipo });
    this.nota.set('');
    this.enlace.set(tipo === 'confirmar' ? (this.profesional()?.linkReunion ?? '') : '');
    this.motivoAccion.set('');
  }

  cerrarAccion(): void {
    this.accion.set(null);
  }

  ejecutarAccion(turno: Turno): void {
    const actual = this.accion();
    if (!actual || actual.id !== turno.id) {
      return;
    }

    let peticion$: Observable<unknown>;
    switch (actual.tipo) {
      case 'confirmar':
        peticion$ = this.clientTurno.confirmar(turno, this.nota(), this.enlace());
        break;
      case 'rechazar':
        peticion$ = this.clientTurno.cancelar(turno, 'profesional', this.motivoAccion(), 'rechazado');
        break;
      default:
        peticion$ = this.clientTurno.cancelar(turno, 'profesional', this.motivoAccion(), 'cancelado');
        break;
    }

    this.procesando.set(true);
    peticion$.subscribe({
      next: () => {
        this.procesando.set(false);
        this.accion.set(null);
        this.recargar();
      },
      error: (err: Error) => {
        this.procesando.set(false);
        if (err.message === 'ESTADO_CAMBIO') {
          alert('Esa solicitud cambió de estado (el cliente pudo haberla cancelado). Se actualizó la lista.');
          this.accion.set(null);
          this.recargar();
        } else {
          alert('No se pudo completar la acción. Intentá de nuevo.');
        }
      },
    });
  }

  cerrarTurno(turno: Turno, estado: 'completado' | 'ausente'): void {
    this.procesando.set(true);
    this.clientTurno.cerrar(turno, estado).subscribe({
      next: () => {
        this.procesando.set(false);
        this.recargar();
      },
      error: () => {
        this.procesando.set(false);
        alert('No se pudo actualizar el turno.');
      },
    });
  }

  // ===== Disponibilidad =====
  alternarDia(dia: number): void {
    this.diasElegidos.update((dias) =>
      dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia],
    );
  }

  generar(): void {
    if (this.errorGenerador() || this.procesando()) {
      return;
    }

    this.procesando.set(true);
    this.mensajeGenerador.set('');

    this.clientTurno.generarDisponibilidad(this.profesionalId(), this.configuracion()).subscribe({
      next: (creados) => {
        this.procesando.set(false);
        this.mensajeGenerador.set(`Se crearon ${creados} horarios nuevos.`);
        this.recargar();
      },
      error: () => {
        this.procesando.set(false);
        alert('No se pudieron generar los horarios.');
      },
    });
  }

  quitarLibre(turno: Turno): void {
    this.clientTurno.eliminarTurnos([turno.id!]).subscribe({ next: () => this.recargar() });
  }

  vaciarDia(turnos: Turno[]): void {
    const fecha = turnos[0]?.fecha;
    if (!fecha || !confirm(`¿Quitar todos los horarios libres del ${formatearFecha(fecha)}?`)) {
      return;
    }
    this.clientTurno
      .eliminarTurnos(turnos.map((t) => t.id!))
      .subscribe({ next: () => this.recargar() });
  }

  verMasHistorial(): void {
    this.limiteHistorial.update((n) => n + 20);
  }
}
