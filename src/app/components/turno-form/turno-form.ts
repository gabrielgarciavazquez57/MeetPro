import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientTurno } from '../../services/client-turno';
import { Auth } from '../../services/auth';
import { Profesional } from '../../interfaces/profesional';
import { Turno } from '../../interfaces/turno';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-turno-form',
  standalone: true,
  imports: [ReactiveFormsModule, BarraNav],
  templateUrl: './turno-form.html',
  styleUrl: './turno-form.css',
})
export class TurnoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientTurno = inject(ClientTurno);
  private readonly auth = inject(Auth);

  protected readonly modalidades = ['online', 'presencial'] as const;

  private profesional: Profesional | null = null;
  readonly nombreProfesional = signal('');

  protected readonly form = this.fb.nonNullable.group({
    fecha:     ['', [Validators.required]],
    hora:      ['', [Validators.required]],
    modalidad: ['', [Validators.required]],
  });

  // ===== GETTERS =====
  get fecha()     { return this.form.controls.fecha; }
  get hora()      { return this.form.controls.hora; }
  get modalidad() { return this.form.controls.modalidad; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('profesionalId');

    if (!id) {
      this.router.navigate(['/profesionales-lista']);
      return;
    }

    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => {
        this.profesional = lista.find((p) => p.professionalId === id) ?? null;

        if (!this.profesional) {
          alert('No se encontró el profesional.');
          this.router.navigate(['/profesionales-lista']);
          return;
        }

        const u = this.profesional.profesional_userData;

        const logueado = this.auth.usuario();
        if (!logueado || logueado.id !== u.id) {
          alert('Solo el profesional puede agregar turnos a su lista.');
          this.router.navigate(['/turnos', id]);
          return;
        }

        this.nombreProfesional.set(`${u.name} ${u.lastname}`);
      },
      error: () => {
        alert('No se pudo cargar el profesional.');
        this.router.navigate(['/profesionales-lista']);
      },
    });
  }

  handleSubmit(): void {
    if (this.form.invalid || !this.profesional) {
      alert('Formulario inválido.');
      return;
    }

    const raw = this.form.getRawValue();

    const nuevo_turno: Turno = {
      fecha: raw.fecha,
      hora: raw.hora,
      modalidad: raw.modalidad as 'online' | 'presencial',
      disponible: true,
      profesional: this.profesional,
    };

    this.clientTurno.addTurno(nuevo_turno).subscribe(() => {
      alert('Turno creado con éxito.');
      this.router.navigate(['/turnos', this.profesional!.professionalId]);
    });
  }
}
