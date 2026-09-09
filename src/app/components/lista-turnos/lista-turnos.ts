import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientTurno } from '../../services/client-turno';
import { ClientProfesional } from '../../services/client-profesional';
import { Turno } from '../../interfaces/turno';
import { Profesional } from '../../interfaces/profesional';
import { Auth } from '../../services/auth';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-lista-turnos',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './lista-turnos.html',
  styleUrl: './lista-turnos.css',
})
export class ListaTurnos implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);

  readonly profesionalId = signal<string>('');

  turnos = signal<Turno[]>([]);
  profesional = signal<Profesional | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  /** Turno que el cliente seleccionó de la tabla */
  seleccionado = signal<Turno | null>(null);

  /** Turnos disponibles de este profesional, ordenados por fecha y hora */
  readonly turnosDisponibles = computed(() => {
    const id = this.profesionalId();
    return this.turnos()
      .filter((t) => t.profesional?.professionalId === id && t.disponible !== false)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  });

  /** Datos de usuario del profesional dueño de la lista */
  private readonly usuarioProfesional = computed(
    () =>
      this.profesional()?.profesional_userData ??
      this.turnos().find((t) => t.profesional?.professionalId === this.profesionalId())
        ?.profesional?.profesional_userData ??
      null,
  );

  /** Nombre del profesional para la cabecera */
  readonly nombreProfesional = computed(() => {
    const u = this.usuarioProfesional();
    return u ? `${u.name} ${u.lastname}` : '';
  });

  /** true solo si el usuario logueado es el profesional dueño de esta lista */
  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const dueno = this.usuarioProfesional();
    return !!logueado && !!dueno && logueado.id === dueno.id;
  });

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    this.cargarProfesional();
    this.cargarTurnos();
  }

  cargarProfesional(): void {
    const id = this.profesionalId();
    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => {
        this.profesional.set(lista.find((p) => p.professionalId === id) ?? null);
      },
      error: (err) => console.error('Error al traer el profesional:', err),
    });
  }

  cargarTurnos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.clientTurno.getTurnos().subscribe({
      next: (data) => {
        this.turnos.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer turnos:', err);
        this.error.set('No se pudieron cargar los turnos.');
        this.cargando.set(false);
      },
    });
  }

  seleccionar(turno: Turno): void {
    this.seleccionado.set(turno);
  }

  confirmar(): void {
    const t = this.seleccionado();
    if (!t) return;
    alert(`Turno solicitado: ${t.fecha} a las ${t.hora} (${t.modalidad}).`);
  }
}
