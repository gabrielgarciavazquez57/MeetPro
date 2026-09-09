import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  /** Modo edición: viene del data de la ruta `editar-profesional/:userId` */
  protected readonly editando = this.route.snapshot.data['editar'] === true;
  /** id del registro de profesional a actualizar (solo en modo edición) */
  private registroId: string | null = null;

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
      next: (user) => {
        this.userData = user;
        if (this.editando) {
          this.cargarProfesionalExistente(userId);
        }
      },
      error: () => {
        alert('No se pudo cargar el usuario.');
        this.router.navigate(['/CreateUser']);
      }
    });
  }

  private cargarProfesionalExistente(userId: string) {
    this.clientProfesional.getProfesionalByUserID(userId).subscribe({
      next: (lista) => {
        const prof = lista[0];
        if (!prof) {
          alert('No tenés un perfil profesional para editar.');
          this.router.navigate(['/perfil-user', userId]);
          return;
        }

        this.registroId = prof.id ?? null;

        this.form.patchValue({
          profession: prof.profession,
          professionalId: prof.professionalId,
          descriptionprofesional: prof.descriptionprofesional,
        });

        this.reemplazarArray(this.titulos, prof.titulos ?? [], () => this.crearTitulo());
        this.reemplazarArray(this.experiencias, prof.experiencias ?? [], () => this.crearExperiencia());
      },
      error: () => {
        alert('No se pudo cargar el perfil profesional.');
        this.router.navigate(['/perfil-user', userId]);
      }
    });
  }

  private reemplazarArray(arr: FormArray, items: unknown[], crear: () => FormGroup) {
    arr.clear();
    if (items.length === 0) {
      arr.push(crear());
      return;
    }
    for (const item of items) {
      const grupo = crear();
      grupo.patchValue(item as Record<string, unknown>);
      arr.push(grupo);
    }
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

    const raw = this.form.getRawValue();

    if (this.editando) {
      if (!this.registroId) {
        alert('No se encontró el perfil profesional a editar.');
        return;
      }
      if (!confirm('¿Guardar los cambios en tu perfil profesional?')) {
        return;
      }

      const profesional_editado: Profesional = {
        id: this.registroId,
        profesional_userData: this.userData,
        ...raw,
      };

      this.clientProfesional.updateProfesional(this.registroId, profesional_editado).subscribe(() => {
        alert('Perfil profesional actualizado con éxito!');
        this.router.navigate(['/perfil-prof', this.userData!.id]);
      });
      return;
    }

    if (confirm('Desea registrar este perfil profesional?')) {
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