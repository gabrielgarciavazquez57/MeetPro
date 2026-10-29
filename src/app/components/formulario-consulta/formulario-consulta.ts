import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Auth } from '../../services/auth';
import { ClientConsulta } from '../../services/client-consulta';
import { BarraNav } from '../barra-nav/barra-nav';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-formulario-consulta',
  standalone: true,
  imports: [ReactiveFormsModule, BarraNav],
  templateUrl: './formulario-consulta.html',
  styleUrl: './formulario-consulta.css',
})
export class FormularioConsulta implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly clientConsulta = inject(ClientConsulta);

  /** Matrícula del profesional al que va dirigida la consulta */
  private professionalId = '';
  readonly enviando = signal<boolean>(false);

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
    this.professionalId = this.route.snapshot.paramMap.get('profesionalId') ?? '';
    if (!this.professionalId) {
      this.router.navigate(['/profesionales-lista']);
      return;
    }

    const u = this.auth.usuario();

    if (!u) {
      this.toast.mostrar('Necesitás iniciar sesión para enviar una consulta.');
      this.router.navigate(['/login']);
      return;
    }

    this.form.patchValue({
      nombre: u.name,
      apellido: u.lastname,
      email: u.email,
    });
  }

  volver(): void {
    this.location.back();
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
      this.toast.mostrar('Completá el título y la descripción de la consulta.');
      return;
    }

    const usuario = this.auth.usuario();
    if (!usuario?.id || this.enviando()) {
      return;
    }

    const { titulo, nombre, apellido, email, descripcion } = this.form.getRawValue();

    this.enviando.set(true);
    this.clientConsulta
      .addConsulta({
        professionalId: this.professionalId,
        userId: String(usuario.id),
        nombre,
        apellido,
        email,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.toast.mostrar('Consulta enviada con éxito. Vas a ver la respuesta en tus notificaciones.');
          this.router.navigate(['/consultas']);
        },
        error: () => {
          this.enviando.set(false);
          this.toast.mostrar('No se pudo enviar la consulta. Intentá de nuevo.');
        },
      });
  }
}
