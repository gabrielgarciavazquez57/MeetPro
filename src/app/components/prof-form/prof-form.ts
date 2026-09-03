import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientUser } from '../../services/client-user';
import { ClientProfesional } from '../../services/client-profesional'; // 👈 nuevo
import { User } from '../../interfaces/user';
import { Profesional } from '../../interfaces/profesional';

@Component({
  selector: 'app-profesional-form',
  imports: [ReactiveFormsModule],
  templateUrl: './prof-form.html',
  styleUrl: './prof-form.css',
})
export class ProfesionalForm implements OnInit {
  protected readonly fb = inject(FormBuilder);
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly client = inject(ClientUser);
  protected readonly clientProfesional = inject(ClientProfesional); // 👈 nuevo

  protected userData: User | null = null;

  protected readonly form = this.fb.nonNullable.group({
    profession:            ['', [Validators.required]],
    professionalId:        ['', [Validators.required]],
    descriptionprofesional:['', [Validators.required, Validators.maxLength(500)]],
    titulos:      this.fb.array([this.crearTitulo()]),
    experiencias: this.fb.array([this.crearExperiencia()]),
  });

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId');

    if (!userId) {
      alert('No se encontró el usuario. Volviendo al registro.');
      this.router.navigate(['/CreateUser']);
      return;
    }

    this.client.getUserByID(userId).subscribe({
      next: (user) => this.userData = user,
      error: () => {
        alert('No se pudo cargar el usuario.');
        this.router.navigate(['/CreateUser']);
      }
    });
  }

  // ===== GETTERS =====
  get profession()             { return this.form.controls.profession; }
  get professionalId()         { return this.form.controls.professionalId; }
  get descriptionprofesional() { return this.form.controls.descriptionprofesional; }
  get titulos()      { return this.form.controls.titulos as FormArray; }
  get experiencias() { return this.form.controls.experiencias as FormArray; }

  // ===== TITULOS =====
  crearTitulo() {
    return this.fb.nonNullable.group({
      nombre_titulo:          ['', [Validators.required]],
      descripcion_titulo:     ['', [Validators.required, Validators.maxLength(300)]],
      fecha_obtencion:        ['', [Validators.required]],
      institucion_educativa:  ['', [Validators.required]],
    });
  }

  agregarTitulo() {
    this.titulos.push(this.crearTitulo());
  }

  eliminarTitulo(index: number) {
    this.titulos.removeAt(index);
  }

  // ===== EXPERIENCIAS =====
  crearExperiencia() {
    return this.fb.nonNullable.group({
      titulo_experiencia:      ['', [Validators.required]],
      institucion_experiencia: ['', [Validators.required]],
      fecha_inicio:            ['', [Validators.required]],
      fecha_fin:               [''],
    });
  }

  agregarExperiencia() {
    this.experiencias.push(this.crearExperiencia());
  }

  eliminarExperiencia(index: number) {
    this.experiencias.removeAt(index);
  }

  // ===== SUBMIT =====
  handleSubmit() {
    if (this.form.invalid || !this.userData) {
      alert('Formulario invalido o usuario no cargado!');
      return;
    }

    if (confirm('Desea registrar este perfil profesional?')) {
      const raw = this.form.getRawValue();

      const new_profesional: Profesional = {
        profesional_userData: this.userData,
        ...raw,
      };

      this.clientProfesional.addProfesional(new_profesional).subscribe(() => {
        alert('Perfil profesional registrado con éxito!');
        this.router.navigate(['/']);
      });
    }
  }
}