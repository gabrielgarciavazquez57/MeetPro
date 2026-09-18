import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientContenido } from '../../services/client-contenido';
import { ContenidoProfesionalCliente } from '../../interfaces/contenido-profesional-cliente';

@Component({
  selector: 'app-formulario-contenido',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-contenido.html',
  styleUrl: './formulario-contenido.css',
})
export class FormularioContenido implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientContenido = inject(ClientContenido);

  readonly profesionalId = input.required<string>();
  readonly tipo = input.required<'profesional' | 'cliente'>();
  /** Contenido a editar (null = alta de contenido nuevo) */
  readonly contenidoEditar = input<ContenidoProfesionalCliente | null>(null);

  /** Se emite al cerrar el modal sin guardar (fondo, botón X o cancelar) */
  readonly cerrado = output<void>();
  /** Se emite luego de guardar el contenido con éxito */
  readonly guardado = output<void>();

  /** Archivos adjuntos seleccionados */
  readonly archivos = signal<File[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    titulo:      ['', [Validators.required, Validators.maxLength(120)]],
    fecha:       [{ value: '', disabled: true }],
    hora:        [{ value: '', disabled: true }],
    descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
    link:        [''],
    dniCliente:  [''],
  });

  // ===== GETTERS =====
  get titulo()      { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }
  get dniCliente()  { return this.form.controls.dniCliente; }

  ngOnInit(): void {
    if (this.tipo() === 'profesional') {
      this.dniCliente.addValidators(Validators.required);
      this.dniCliente.updateValueAndValidity();
    }

    const editar = this.contenidoEditar();

    if (editar) {
      this.form.patchValue({
        titulo: editar.titulo,
        fecha: editar.fecha,
        hora: editar.hora,
        descripcion: editar.descripcion,
        link: editar.link,
        dniCliente: editar.dniCliente ?? '',
      });
      return;
    }

    const ahora = new Date();
    this.form.patchValue({
      fecha: ahora.toISOString().slice(0, 10),
      hora: ahora.toTimeString().slice(0, 5),
    });
  }

  onArchivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    this.archivos.update((lista) => [...lista, ...Array.from(input.files!)]);
    input.value = '';
  }

  quitarArchivo(indice: number): void {
    this.archivos.update((lista) => lista.filter((_, i) => i !== indice));
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  handleSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Completá el título y la descripción.');
      return;
    }

    const { titulo, fecha, hora, descripcion, link, dniCliente } = this.form.getRawValue();
    const editar = this.contenidoEditar();

    const contenido: ContenidoProfesionalCliente = {
      professionalId: this.profesionalId(),
      tipo: this.tipo(),
      titulo,
      fecha,
      hora,
      descripcion,
      link,
      ...(this.tipo() === 'profesional' ? { dniCliente: dniCliente.trim() } : {}),
    };

    const peticion =
      editar?.id != null
        ? this.clientContenido.updateContenido(editar.id, { ...contenido, id: editar.id })
        : this.clientContenido.addContenido(contenido);

    peticion.subscribe(() => {
      alert(editar ? 'Contenido actualizado con éxito.' : 'Contenido cargado con éxito.');
      this.guardado.emit();
    });
  }
}
