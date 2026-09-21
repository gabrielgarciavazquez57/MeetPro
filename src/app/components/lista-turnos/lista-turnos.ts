import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { Auth } from '../../services/auth';
import { Turno } from '../../interfaces/turno';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import {
  agruparPorDia,
  aISO,
  formatearFecha,
  haComenzado,
  hoyISO,
  nombreMes,
  ordenarPorFecha,
  rangoHorario,
} from '../../shared/turno-utils';

interface CeldaCalendario {
  fecha: string;
  dia: number;
  delMes: boolean;
  libres: number;
  esHoy: boolean;
}

@Component({
  selector: 'app-lista-turnos',
  standalone: true,
  imports: [BarraNav, RouterLink, FormsModule],
  templateUrl: './lista-turnos.html',
  styleUrls: ['../../shared/turnos.css', './lista-turnos.css'],
})
export class ListaTurnos implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly formatearFecha = formatearFecha;
  protected readonly rangoHorario = rangoHorario;
  protected readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly turnos = signal<Turno[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // ===== Selección =====
  readonly mes = signal<{ anio: number; mes: number }>({
    anio: new Date().getFullYear(),
    mes: new Date().getMonth(),
  });
  readonly diaSeleccionado = signal<string>('');
  readonly turnoElegido = signal<Turno | null>(null);
  readonly motivo = signal<string>('');
  readonly motivoTocado = signal<boolean>(false);
  readonly enviando = signal<boolean>(false);
  readonly errorReserva = signal<string | null>(null);
  readonly reservado = signal<Turno | null>(null);

  readonly usuario = this.auth.usuario;

  // ===== Datos derivados =====
  readonly usuarioProfesional = computed(() => this.profesional()?.profesional_userData ?? null);

  readonly nombreProfesional = computed(() => {
    const u = this.usuarioProfesional();
    return u ? `${u.name} ${u.lastname}` : '';
  });

  readonly profesionalUsuarioId = computed(() => this.usuarioProfesional()?.id ?? null);

  readonly clienteId = computed(() => this.auth.usuario()?.id ?? null);

  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const dueno = this.usuarioProfesional();
    return !!logueado && !!dueno && String(logueado.id) === String(dueno.id);
  });

  /** Horarios libres que todavía no empezaron */
  readonly libres = computed(() =>
    ordenarPorFecha(this.turnos().filter((t) => t.estado === 'disponible' && !haComenzado(t))),
  );

  readonly libresPorDia = computed(
    () => new Map(agruparPorDia(this.libres()).map((g) => [g.fecha, g.turnos] as const)),
  );

  readonly slotsDelDia = computed(() => this.libresPorDia().get(this.diaSeleccionado()) ?? []);

  readonly tituloMes = computed(() => nombreMes(this.mes().anio, this.mes().mes));

  readonly puedeRetroceder = computed(() => {
    const { anio, mes } = this.mes();
    const hoy = new Date();
    return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes > hoy.getMonth());
  });

  readonly puedeAvanzar = computed(() => {
    const { anio, mes } = this.mes();
    const hoy = new Date();
    return (anio - hoy.getFullYear()) * 12 + (mes - hoy.getMonth()) < 12;
  });

  readonly semanas = computed<CeldaCalendario[][]>(() => {
    const { anio, mes } = this.mes();
    const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const cursor = new Date(anio, mes, 1 - desfase);
    const porDia = this.libresPorDia();
    const hoy = hoyISO();
    const semanas: CeldaCalendario[][] = [];

    for (let s = 0; s < 6; s++) {
      const semana: CeldaCalendario[] = [];
      for (let d = 0; d < 7; d++) {
        const fecha = aISO(cursor);
        semana.push({
          fecha,
          dia: cursor.getDate(),
          delMes: cursor.getMonth() === mes,
          libres: porDia.get(fecha)?.length ?? 0,
          esHoy: fecha === hoy,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      semanas.push(semana);
    }

    return semanas.filter((semana, i) => i < 5 || semana.some((c) => c.delMes));
  });

  readonly motivoInvalido = computed(() => this.motivo().trim().length < 5);

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

        if (this.esDueno()) {
          this.router.navigate(['/agenda', id], { replaceUrl: true });
          return;
        }

        this.turnos.set(turnos);
        this.seleccionarPrimerDia();
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer los turnos:', err);
        this.error.set('No se pudieron cargar los turnos.');
        this.cargando.set(false);
      },
    });
  }

  private recargarTurnos(): void {
    this.clientTurno.getTurnosDeProfesional(this.profesionalId()).subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.turnoElegido.set(null);
        this.seleccionarPrimerDia();
      },
    });
  }

  /** Deja seleccionado el primer día con horarios (y muestra su mes) si el actual ya no tiene */
  private seleccionarPrimerDia(): void {
    const porDia = this.libresPorDia();
    if (porDia.has(this.diaSeleccionado())) {
      return;
    }
    const primero = [...porDia.keys()][0] ?? '';
    this.diaSeleccionado.set(primero);
    if (primero) {
      this.mostrarMesDe(primero);
    }
  }

  private mostrarMesDe(fecha: string): void {
    const d = new Date(`${fecha}T00:00`);
    this.mes.set({ anio: d.getFullYear(), mes: d.getMonth() });
  }

  // ===== Calendario =====
  mesAnterior(): void {
    if (!this.puedeRetroceder()) {
      return;
    }
    const { anio, mes } = this.mes();
    this.mes.set(mes === 0 ? { anio: anio - 1, mes: 11 } : { anio, mes: mes - 1 });
  }

  mesSiguiente(): void {
    if (!this.puedeAvanzar()) {
      return;
    }
    const { anio, mes } = this.mes();
    this.mes.set(mes === 11 ? { anio: anio + 1, mes: 0 } : { anio, mes: mes + 1 });
  }

  elegirDia(celda: CeldaCalendario): void {
    if (celda.libres === 0) {
      return;
    }
    this.diaSeleccionado.set(celda.fecha);
    this.turnoElegido.set(null);
    this.errorReserva.set(null);
    if (!celda.delMes) {
      this.mostrarMesDe(celda.fecha);
    }
  }

  elegirTurno(turno: Turno): void {
    this.turnoElegido.set(turno);
    this.errorReserva.set(null);
  }

  // ===== Reserva =====
  solicitar(): void {
    const turno = this.turnoElegido();
    if (!turno?.id) {
      return;
    }

    const cliente = this.auth.usuario();
    if (!cliente) {
      alert('Iniciá sesión para solicitar un turno.');
      this.router.navigate(['/login']);
      return;
    }

    this.motivoTocado.set(true);
    if (this.motivoInvalido()) {
      return;
    }

    this.enviando.set(true);
    this.errorReserva.set(null);

    this.clientTurno.reservar(turno.id, cliente, this.motivo().trim()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.reservado.set(turno);
      },
      error: (err: Error) => {
        this.enviando.set(false);
        if (err.message === 'NO_DISPONIBLE') {
          this.errorReserva.set('Ese horario acaba de ser reservado por otra persona. Elegí otro.');
          this.recargarTurnos();
        } else if (err.message === 'CHOQUE_HORARIO') {
          this.errorReserva.set('Ya tenés otro turno en ese mismo horario.');
        } else {
          this.errorReserva.set('No se pudo enviar la solicitud. Intentá de nuevo.');
        }
      },
    });
  }

  reservarOtro(): void {
    this.reservado.set(null);
    this.motivo.set('');
    this.motivoTocado.set(false);
    this.recargarTurnos();
  }
}
