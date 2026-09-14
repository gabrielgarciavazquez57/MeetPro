import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientContenido } from '../../services/client-contenido';

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
  });

  // ===== GETTERS =====
  get titulo()      { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }

  ngOnInit(): void {
    const ahora = new Date();
    const fechaHoy = ahora.toISOString().slice(0, 10);
    const horaAhora = ahora.toTimeString().slice(0, 5);

    this.form.patchValue({ fecha: fechaHoy, hora: horaAhora });
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

    const { titulo, fecha, hora, descripcion, link } = this.form.getRawValue();

    this.clientContenido
      .addContenido({
        professionalId: this.profesionalId(),
        tipo: this.tipo(),
        titulo,
        fecha,
        hora,
        descripcion,
        link,
      })
      .subscribe(() => {
        alert('Contenido cargado con éxito.');
        this.guardado.emit();
      });
  }
}
