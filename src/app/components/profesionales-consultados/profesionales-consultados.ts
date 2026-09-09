import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientTurno } from '../../services/client-turno';
import { Turno } from '../../interfaces/turno';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-profesionales-consultados',
  standalone: true,
  imports: [BarraNav],
  templateUrl: './profesionales-consultados.html',
  styleUrl: './profesionales-consultados.css',
})
export class ProfesionalesConsultados implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly route = inject(ActivatedRoute);

  private readonly userId = signal<string>('');

  turnos = signal<Turno[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  /** Turnos ya asistidos por el usuario (reservados y con fecha pasada) */
  readonly consultados = computed(() =>
    this.turnos()
      .filter((t) => t.cliente?.id === this.userId() && this.yaPaso(t))
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)),
  );

  ngOnInit(): void {
    this.userId.set(this.route.snapshot.paramMap.get('userId') ?? '');
    this.cargarTurnos();
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

  private yaPaso(turno: Turno): boolean {
    const fechaHora = new Date(`${turno.fecha}T${turno.hora || '00:00'}`);
    return fechaHora.getTime() < Date.now();
  }
}
