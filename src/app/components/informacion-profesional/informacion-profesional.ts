import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientInformacionProfesional } from '../../services/client-informacion-profesional';
import { ClientProyecto } from '../../services/client-proyecto';
import { Auth } from '../../services/auth';
import { Profesional } from '../../interfaces/profesional';
import { InformacionProfesional } from '../../interfaces/informacion-profesional';
import { Proyecto } from '../../interfaces/proyecto';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-informacion-profesional',
  standalone: true,
  imports: [BarraNav, ReactiveFormsModule],
  templateUrl: './informacion-profesional.html',
  styleUrl: './informacion-profesional.css',
})
export class InformacionProfesionalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientInformacion = inject(ClientInformacionProfesional);
  private readonly clientProyecto = inject(ClientProyecto);
  private readonly auth = inject(Auth);

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly informacion = signal<InformacionProfesional | null>(null);
  readonly proyectos = signal<Proyecto[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Muestra u oculta el formulario de edición de la descripción ampliada */
  readonly editando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    descripcionAmpliada: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  get descripcionAmpliada() { return this.form.controls.descripcionAmpliada; }

  /** Muestra u oculta el formulario para agregar un proyecto */
  readonly mostrandoFormProyecto = signal<boolean>(false);
  readonly guardandoProyecto = signal<boolean>(false);
  readonly imagenProyectoPreview = signal<string>('');

  protected readonly formProyecto = this.fb.nonNullable.group({
    titulo_proyecto:       ['', [Validators.required]],
    fecha_inicio:          ['', [Validators.required]],
    fecha_finalizacion:    [''],
    descripcion_proyecto:  ['', [Validators.required, Validators.maxLength(800)]],
    imagen_proyecto:       [''],
  });

  get titulo_proyecto()      { return this.formProyecto.controls.titulo_proyecto; }
  get fecha_inicio_p()       { return this.formProyecto.controls.fecha_inicio; }
  get descripcion_proyecto() { return this.formProyecto.controls.descripcion_proyecto; }
  get imagen_proyecto()      { return this.formProyecto.controls.imagen_proyecto; }

  /** Solo el profesional dueño de este perfil puede cargar/editar la descripción ampliada */
  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const u = this.profesional()?.profesional_userData;
    return !!logueado && !!u && String(logueado.id) === String(u.id);
  });

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    this.cargarProfesional();
    this.cargarInformacion();
    this.cargarProyectos();
  }

  private cargarProfesional(): void {
    const id = this.profesionalId();
    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => this.profesional.set(lista.find((p) => p.professionalId === id) ?? null),
      error: (err) => console.error('Error al traer el profesional:', err),
    });
  }

  cargarInformacion(): void {
    this.cargando.set(true);
    this.error.set(null);

    const id = this.profesionalId();
    this.clientInformacion.getInformaciones().subscribe({
      next: (data) => {
        this.informacion.set(data.find((i) => String(i.professionalId) === id) ?? null);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer la información profesional:', err);
        this.error.set('No se pudo cargar la información profesional.');
        this.cargando.set(false);
      },
    });
  }

  abrirEdicion(): void {
    if (!this.esDueno()) {
      return;
    }
    this.form.setValue({ descripcionAmpliada: this.informacion()?.descripcionAmpliada ?? '' });
    this.editando.set(true);
  }

  cancelar(): void {
    this.editando.set(false);
  }

  guardar(): void {
    const prof = this.profesional();
    if (this.form.invalid || !prof) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const { descripcionAmpliada } = this.form.getRawValue();
    const actual = this.informacion();

    const datos: InformacionProfesional = {
      professionalId: this.profesionalId(),
      profesional_userData: prof.profesional_userData,
      descripcionAmpliada: descripcionAmpliada.trim(),
    };

    const alTerminar = (guardada: InformacionProfesional) => {
      this.informacion.set(guardada);
      this.guardando.set(false);
      this.editando.set(false);
    };

    if (actual?.id) {
      this.clientInformacion.updateInformacion(actual.id, { ...datos, id: actual.id }).subscribe({
        next: alTerminar,
        error: () => {
          this.guardando.set(false);
          alert('No se pudo guardar la descripción ampliada.');
        },
      });
    } else {
      this.clientInformacion.addInformacion(datos).subscribe({
        next: alTerminar,
        error: () => {
          this.guardando.set(false);
          alert('No se pudo guardar la descripción ampliada.');
        },
      });
    }
  }

  // ===== PROYECTOS =====
  private cargarProyectos(): void {
    const id = this.profesionalId();
    this.clientProyecto.getProyectos().subscribe({
      next: (data) => this.proyectos.set(data.filter((p) => String(p.professionalId) === id)),
      error: (err) => console.error('Error al traer los proyectos:', err),
    });
  }

  abrirFormProyecto(): void {
    if (!this.esDueno()) {
      return;
    }
    this.formProyecto.reset({
      titulo_proyecto: '',
      fecha_inicio: '',
      fecha_finalizacion: '',
      descripcion_proyecto: '',
      imagen_proyecto: '',
    });
    this.imagenProyectoPreview.set('');
    this.mostrandoFormProyecto.set(true);
  }

  cancelarProyecto(): void {
    this.mostrandoFormProyecto.set(false);
  }

  onImagenProyecto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const dataUrl = lector.result as string;
      this.imagenProyectoPreview.set(dataUrl);
      this.imagen_proyecto.setValue(dataUrl);
    };
    lector.readAsDataURL(file);
    input.value = '';
  }

  guardarProyecto(): void {
    if (this.formProyecto.invalid) {
      this.formProyecto.markAllAsTouched();
      return;
    }

    this.guardandoProyecto.set(true);
    const raw = this.formProyecto.getRawValue();

    const nuevo: Proyecto = {
      professionalId: this.profesionalId(),
      titulo_proyecto: raw.titulo_proyecto.trim(),
      fecha_inicio: raw.fecha_inicio,
      fecha_finalizacion: raw.fecha_finalizacion,
      descripcion_proyecto: raw.descripcion_proyecto.trim(),
      imagen_proyecto: raw.imagen_proyecto,
    };

    this.clientProyecto.addProyecto(nuevo).subscribe({
      next: (creado) => {
        this.proyectos.update((lista) => [creado, ...lista]);
        this.guardandoProyecto.set(false);
        this.mostrandoFormProyecto.set(false);
      },
      error: () => {
        this.guardandoProyecto.set(false);
        alert('No se pudo guardar el proyecto.');
      },
    });
  }

  eliminarProyecto(id: string | number | undefined): void {
    if (id == null || !this.esDueno() || !confirm('¿Eliminar este proyecto?')) {
      return;
    }
    this.clientProyecto.deleteProyecto(id).subscribe({
      next: () => this.proyectos.update((lista) => lista.filter((p) => p.id !== id)),
      error: () => alert('No se pudo eliminar el proyecto.'),
    });
  }
}
