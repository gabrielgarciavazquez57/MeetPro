import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientValoracion } from '../../services/client-valoracion';
import { Auth } from '../../services/auth';
import { Profesional } from '../../interfaces/profesional';
import { Valoracion } from '../../interfaces/valoracion';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-valoraciones',
  standalone: true,
  imports: [BarraNav, ReactiveFormsModule],
  templateUrl: './valoraciones.html',
  styleUrl: './valoraciones.css',
})
export class Valoraciones implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientValoracion = inject(ClientValoracion);
  private readonly auth = inject(Auth);

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly valoraciones = signal<Valoracion[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Muestra u oculta el formulario para agregar una valoración */
  readonly mostrandoForm = signal<boolean>(false);
  readonly enviando = signal<boolean>(false);

  protected readonly puntajes = [5, 4, 3, 2, 1] as const;

  protected readonly form = this.fb.nonNullable.group({
    puntaje:     [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
  });

  get puntaje()     { return this.form.controls.puntaje; }
  get descripcion() { return this.form.controls.descripcion; }

  readonly nombreProfesional = computed(() => {
    const u = this.profesional()?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : '';
  });

  /** Promedio de puntajes (0 si no hay valoraciones) */
  readonly promedio = computed(() => {
    const lista = this.valoraciones();
    if (lista.length === 0) return 0;
    const total = lista.reduce((acc, v) => acc + (v.puntaje ?? 0), 0);
    return Math.round((total / lista.length) * 10) / 10;
  });

  readonly hayUsuario = computed(() => !!this.auth.usuario());

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    this.cargarProfesional();
    this.cargarValoraciones();
  }

  private cargarProfesional(): void {
    const id = this.profesionalId();
    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => this.profesional.set(lista.find((p) => p.professionalId === id) ?? null),
      error: (err) => console.error('Error al traer el profesional:', err),
    });
  }

  cargarValoraciones(): void {
    this.cargando.set(true);
    this.error.set(null);

    const id = this.profesionalId();
    this.clientValoracion.getValoraciones().subscribe({
      next: (data) => {
        this.valoraciones.set(
          data
            .filter((v) => String(v.professionalId) === id)
            .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')),
        );
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer valoraciones:', err);
        this.error.set('No se pudieron cargar las valoraciones.');
        this.cargando.set(false);
      },
    });
  }

  estrellas(puntaje: number): string {
    const n = Math.max(0, Math.min(5, Math.round(puntaje)));
    return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n);
  }

  abrirForm(): void {
    if (!this.auth.usuario()) {
      alert('Iniciá sesión para dejar una valoración.');
      return;
    }
    this.mostrandoForm.set(true);
  }

  cancelar(): void {
    this.mostrandoForm.set(false);
    this.form.reset({ puntaje: 5, descripcion: '' });
  }

  enviar(): void {
    const usuario = this.auth.usuario();
    if (!usuario) {
      alert('Iniciá sesión para dejar una valoración.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const { puntaje, descripcion } = this.form.getRawValue();

    const nueva: Valoracion = {
      professionalId: this.profesionalId(),
      nombre: usuario.name,
      apellido: usuario.lastname,
      fecha: new Date().toISOString().slice(0, 10),
      puntaje,
      descripcion: descripcion.trim(),
    };

    this.clientValoracion.addValoracion(nueva).subscribe({
      next: (creada) => {
        this.valoraciones.update((lista) => [creada, ...lista]);
        this.enviando.set(false);
        this.cancelar();
      },
      error: () => {
        this.enviando.set(false);
        alert('No se pudo enviar la valoración.');
      },
    });
  }
}
