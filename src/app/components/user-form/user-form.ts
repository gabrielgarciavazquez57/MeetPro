import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../interfaces/user';
import { ClientUser } from '../../services/client-user';
import { countries, type ICountry } from 'countries-list';

function passwordsIguales(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const repeat = control.get('password_repeat')?.value;
  return password === repeat ? null : { passwordsNoCoinciden: true };
}

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm implements OnInit {
  protected readonly fb = inject(FormBuilder);
  protected readonly client = inject(ClientUser);
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);

  /** Modo edición: viene del data de la ruta `editar-usuario/:id` */
  protected readonly editando = this.route.snapshot.data['editar'] === true;
  /** id del usuario a actualizar (solo en modo edición) */
  private usuarioId: string | number | null = null;

  protected readonly tipos_gen = ['Masculino', 'Femenino', 'No especifico'] as const;
  protected readonly paises = Object.values(countries)
    .map(c => (c as ICountry).name)
    .sort();

  protected readonly form = this.fb.nonNullable.group({
    username:        ['', [Validators.required, Validators.minLength(5), Validators.maxLength(10)]],
    password:        ['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
    password_repeat: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
    isProfesional:   [false, [Validators.required]],
    name:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(15)]],
    lastname:        ['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
    dni:             ['', [Validators.required, Validators.minLength(7), Validators.maxLength(8)]],
    email:           ['', [Validators.required, Validators.email]],
    phoneNumber:     ['', [Validators.required]],
    age:             [0,  [Validators.required, Validators.min(5)]],
    gender:          ['', [Validators.required]],
    nationality:     ['', [Validators.required]],
    dateOfBirth:     ['', [Validators.required]],
    address: this.fb.nonNullable.group({
      address:    ['', [Validators.required]],
      city:       ['', [Validators.required]],
      province:   ['', [Validators.required]],
      country:    ['', [Validators.required]],
      zipCode:    ['', [Validators.required]],
    }),
  }, { validators: passwordsIguales });

  // ===== GETTERS =====
  get username()        { return this.form.controls.username; }
  get password()        { return this.form.controls.password; }
  get password_repeat() { return this.form.controls.password_repeat; }
  get isProfesional()   { return this.form.controls.isProfesional; }
  get name()            { return this.form.controls.name; }
  get lastname()        { return this.form.controls.lastname; }
  get dni()             { return this.form.controls.dni; }
  get email()           { return this.form.controls.email; }
  get phoneNumber()     { return this.form.controls.phoneNumber; }
  get age()             { return this.form.controls.age; }
  get nationality()     { return this.form.controls.nationality; }
  get gender()          { return this.form.controls.gender; }
  get address()         { return this.form.controls.address; }
  get street()          { return this.form.controls.address.controls.address; }
  get city()            { return this.form.controls.address.controls.city; }
  get province()        { return this.form.controls.address.controls.province; }
  get country()         { return this.form.controls.address.controls.country; }
  get zipCode()         { return this.form.controls.address.controls.zipCode; }
  get dateOfBirth()     { return this.form.controls.dateOfBirth; }

  ngOnInit() {
    if (!this.editando) {
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      alert('No se encontró el usuario a editar.');
      this.router.navigate(['/']);
      return;
    }

    this.client.getUserByID(id).subscribe({
      next: (user) => {
        this.usuarioId = user.id ?? id;
        this.form.patchValue({
          ...user,
          password_repeat: user.password,
          dateOfBirth: this.aFechaInput(user.dateOfBirth),
        });
      },
      error: () => {
        alert('No se pudo cargar el usuario.');
        this.router.navigate(['/']);
      },
    });
  }

  /** Convierte la fecha del backend a formato yyyy-MM-dd para el input date */
  private aFechaInput(fecha: Date | string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

handleSubmit() {
    if (this.form.invalid) {
      alert('Formulario invalido!');
      return;
    }

    const raw = this.form.getRawValue();
    const { password_repeat, ...rest } = raw;

    const user_data: User = {
      ...rest,
      dateOfBirth: new Date(rest.dateOfBirth),
    };

    if (this.editando) {
      if (!this.usuarioId) {
        alert('No se encontró el usuario a editar.');
        return;
      }
      if (!confirm('¿Guardar los cambios en tu perfil?')) {
        return;
      }

      this.client.updateUser(this.usuarioId, { id: this.usuarioId, ...user_data }).subscribe(() => {
        alert('Perfil actualizado con éxito!');
        this.router.navigate(['/perfil-user', this.usuarioId]);
      });
      return;
    }

    if (confirm('Desea registrar este usuario?')) {
      this.client.addUser(user_data).subscribe((createdUser) => {
        alert('Exito al registrarse!');
        this.form.reset();

        if (user_data.isProfesional) {
          this.router.navigate(['/CreateProfesional', createdUser.id]);
        }
      });
    }
  }
}