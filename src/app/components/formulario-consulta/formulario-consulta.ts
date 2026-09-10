import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-formulario-consulta',
  standalone: true,
  imports: [ReactiveFormsModule, BarraNav],
  templateUrl: './formulario-consulta.html',
  styleUrl: './formulario-consulta.css',
})
export class FormularioConsulta implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  /** Archivos adjuntos seleccionados */
  readonly archivos = signal<File[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    titulo:      ['', [Validators.required, Validators.maxLength(120)]],
    nombre:      [{ value: '', disabled: true }],
    apellido:    [{ value: '', disabled: true }],
    email:       [{ value: '', disabled: true }],
    descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  // ===== GETTERS =====
  get titulo()      { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }

  ngOnInit(): void {
    const u = this.auth.usuario();

    if (!u) {
      alert('Necesitás iniciar sesión para enviar una consulta.');
      this.router.navigate(['/login']);
      return;
    }

    this.form.patchValue({
      nombre: u.name,
      apellido: u.lastname,
      email: u.email,
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

  handleSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Completá el título y la descripción de la consulta.');
      return;
    }

    const { titulo, nombre, apellido, email, descripcion } = this.form.getRawValue();

    console.log('Consulta enviada:', {
      titulo,
      nombre,
      apellido,
      email,
      descripcion,
      archivos: this.archivos().map((f) => f.name),
    });

    alert('Consulta enviada con éxito. Te responderemos por email.');
    this.router.navigate(['/']);
  }
}
