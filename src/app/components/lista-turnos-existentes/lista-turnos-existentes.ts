import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientTurno } from '../../services/client-turno';
import { Turno } from '../../interfaces/turno';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-lista-turnos-existentes',
  standalone: true,
  imports: [BarraNav],
  templateUrl: './lista-turnos-existentes.html',
  styleUrl: './lista-turnos-existentes.css',
})
export class ListaTurnosExistentes implements OnInit {
  private readonly clientTurno = inject(ClientTurno);
  private readonly route = inject(ActivatedRoute);

  private readonly userId = signal<string>('');

  turnos = signal<Turno[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  /** Turnos reservados por este usuario, ordenados por fecha y hora */
  readonly misTurnos = computed(() =>
    this.turnos()
      .filter((t) => t.cliente?.id === this.userId())
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)),
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

  /** Activo = el turno todavía no pasó */
  estaActivo(turno: Turno): boolean {
    const fechaHora = new Date(`${turno.fecha}T${turno.hora || '00:00'}`);
    return fechaHora.getTime() >= Date.now();
  }

  cancelar(turno: Turno): void {
    if (!turno.id) return;
    if (!confirm('¿Querés cancelar este turno?')) return;

    const actualizado: Turno = { ...turno, disponible: true, cliente: null };

    this.clientTurno.updateTurno(turno.id, actualizado).subscribe({
      next: () => this.cargarTurnos(),
      error: () => alert('No se pudo cancelar el turno.'),
    });
  }
}
