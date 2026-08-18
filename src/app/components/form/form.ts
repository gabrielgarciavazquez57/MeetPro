import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { User } from '../../interfaces/user';
import { Validators } from '@angular/forms';
//import { countries, type ICountry } from 'countries-list';

// Validador custom fuera de la clase
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
export class UserForm {
  protected readonly fb = inject(FormBuilder);
  protected readonly client = inject(ClientUser);

  readonly isEditing = input(false);
  readonly user_edit = input<User>();

  protected readonly tipos_gen = ['Masculino', 'Femenino', 'No especifico'] as const;
  protected readonly paises = Object.values(countries)
    .map(c => (c as ICountry).name)
    .sort();

    

  protected readonly form = this.fb.nonNullable.group({
    username:       ['', [Validators.required, Validators.minLength(5), Validators.maxLength(10)]],
    password:       ['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
    password_repeat:['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
    name:           ['', [Validators.required, Validators.minLength(2), Validators.maxLength(15)]],
    lastName:       ['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
    dni:            ['', [Validators.required, Validators.minLength(7), Validators.maxLength(8)]],
    email:          ['', [Validators.required, Validators.email]],
    phone:          ['', [Validators.required]],
    age:            [0,  [Validators.required, Validators.min(5)]],
    gender:         ['', [Validators.required]],
    nationality:    ['', [Validators.required]],
    fecha_nacimiento: ['', [Validators.required]],
    user_address: this.fb.nonNullable.group({
      address:    ['', [Validators.required]],
      city:       ['', [Validators.required]],
      province:   ['', [Validators.required]],
      country:    ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
    }),
  }, { validators: passwordsIguales }); // 👈 validador del grupo

  // ===== GETTERS =====
  get username()        { return this.form.controls.username; }
  get password()        { return this.form.controls.password; }
  get password_repeat() { return this.form.controls.password_repeat; }
  get name()            { return this.form.controls.name; }
  get lastName()        { return this.form.controls.lastName; }
  get dni()             { return this.form.controls.dni; }
  get email()           { return this.form.controls.email; }
  get phone()           { return this.form.controls.phone; }
  get age()             { return this.form.controls.age; }
  get nationality()     { return this.form.controls.nationality; }
  get gender()          { return this.form.controls.gender; }
  get user_address()    { return this.form.controls.user_address; }
  get address()         { return this.form.controls.user_address.controls.address; }
  get city()            { return this.form.controls.user_address.controls.city; }
  get province()        { return this.form.controls.user_address.controls.province; }
  get country()         { return this.form.controls.user_address.controls.country; }
  get postalCode()      { return this.form.controls.user_address.controls.postalCode; }
  get fecha_nacimiento()      { return this.form.controls.fecha_nacimiento; }

  // ===== SUBMIT =====
  handleSubmit() {
    if (this.form.invalid) {
      alert('Formulario invalido!');
      return;
    }

    if (confirm('Desea registrar este usuario?')) {
      const new_user = this.form.getRawValue();

      if (!this.isEditing()) {
        this.client.addUser(new_user).subscribe(() => {
          alert('Exito al registrarse!');
          this.form.reset();
        });
      } else {
        this.client.updateUser(this.user_edit()?.id!, new_user).subscribe(() => {
          alert('Usuario editado exitosamente!');
        });
      }
    }
  }
}