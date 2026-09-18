import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, AbstractControl, AsyncValidatorFn, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { map, of } from 'rxjs';
import { User } from '../../interfaces/user';
import { ClientUser } from '../../services/client-user';
import { ClientProfesional } from '../../services/client-profesional';
import { countries, type ICountry } from 'countries-list';

function passwordsIguales(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const repeat = control.get('password_repeat')?.value;
  return password === repeat ? null : { passwordsNoCoinciden: true };
}

/** No permite fechas de nacimiento posteriores al 31/12/2008 */
function fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) {
    return null;
  }
  return valor > '2008-12-31' ? { fechaMaxima: true } : null;
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
  protected readonly clientProfesional = inject(ClientProfesional);
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  /** Modo edición: viene del data de la ruta `editar-usuario/:id` */
  protected readonly editando = this.route.snapshot.data['editar'] === true;
  /** id del usuario a actualizar (solo en modo edición) */
  private usuarioId: string | number | null = null;
  /** era profesional al abrir el form (para detectar si se dio de baja) */
  private eraProfesional = false;

  /** Vista previa de la foto de perfil (data URL) */
  readonly fotoPreview = signal<string>('');

  /** Verifica contra el backend que el DNI no pertenezca a otro usuario */
  private readonly dniDuplicadoValidator: AsyncValidatorFn = (control: AbstractControl) => {
    const dni = (control.value ?? '').trim();
    if (!dni) {
      return of(null);
    }
    return this.client.getUsers().pipe(
      map((usuarios) => {
        const duplicado = usuarios.some(
          (u) => u.dni === dni && String(u.id) !== String(this.usuarioId),
        );
        return duplicado ? { dniDuplicado: true } : null;
      }),
    );
  };

  /** Verifica contra el backend que el email no pertenezca a otro usuario */
  private readonly emailDuplicadoValidator: AsyncValidatorFn = (control: AbstractControl) => {
    const email = (control.value ?? '').trim().toLowerCase();
    if (!email) {
      return of(null);
    }
    return this.client.getUsers().pipe(
      map((usuarios) => {
        const duplicado = usuarios.some(
          (u) => (u.email ?? '').trim().toLowerCase() === email && String(u.id) !== String(this.usuarioId),
        );
        return duplicado ? { emailDuplicado: true } : null;
      }),
    );
  };

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
    dni:             ['', [Validators.required, Validators.minLength(7), Validators.maxLength(8)], [this.dniDuplicadoValidator]],
    email:           ['', [Validators.required, Validators.email], [this.emailDuplicadoValidator]],
    phoneNumber:     ['', [Validators.required]],
    gender:          ['', [Validators.required]],
    nationality:     ['', [Validators.required]],
    dateOfBirth:     ['', [Validators.required, fechaNacimientoValida]],
    fotoPerfil:      [''],
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
  get nationality()     { return this.form.controls.nationality; }
  get gender()          { return this.form.controls.gender; }
  get address()         { return this.form.controls.address; }
  get street()          { return this.form.controls.address.controls.address; }
  get city()            { return this.form.controls.address.controls.city; }
  get province()        { return this.form.controls.address.controls.province; }
  get country()         { return this.form.controls.address.controls.country; }
  get zipCode()         { return this.form.controls.address.controls.zipCode; }
  get dateOfBirth()     { return this.form.controls.dateOfBirth; }
  get fotoPerfil()      { return this.form.controls.fotoPerfil; }

  onFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const dataUrl = lector.result as string;
      this.fotoPreview.set(dataUrl);
      this.fotoPerfil.setValue(dataUrl);
    };
    lector.readAsDataURL(file);
    input.value = '';
  }

  quitarFoto(): void {
    this.fotoPreview.set('');
    this.fotoPerfil.setValue('');
  }

  volver(): void {
    this.location.back();
  }

  // ===== CARRUSEL DE PASOS =====
  readonly pasoActual = signal(0);
  readonly direccionPaso = signal<'izq' | 'der'>('der');

  siguientePaso(): void {
    if (this.pasoActual() >= 2) {
      return;
    }
    this.direccionPaso.set('der');
    this.pasoActual.update((p) => p + 1);
  }

  anteriorPaso(): void {
    if (this.pasoActual() <= 0) {
      return;
    }
    this.direccionPaso.set('izq');
    this.pasoActual.update((p) => p - 1);
  }

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
        this.eraProfesional = user.isProfesional === true;
        this.fotoPreview.set(user.fotoPerfil ?? '');
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

  /** Calcula la edad a partir de la fecha de nacimiento */
  private calcularEdad(fechaNacimiento: string): number {
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) {
      return 0;
    }
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const sinCumplirAun =
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    if (sinCumplirAun) {
      edad--;
    }
    return edad;
  }

  /** Borra el perfil profesional del usuario de la lista de profesionales */
  private eliminarPerfilProfesional(userId: string | number): void {
    this.clientProfesional.getProfesionalByUserID(userId).subscribe({
      next: (lista) => {
        const registroId = lista[0]?.id;
        const finalizar = () => {
          alert('Perfil actualizado. Se quitó tu perfil profesional.');
          this.router.navigate(['/perfil-user', userId]);
        };

        if (registroId == null) {
          finalizar();
          return;
        }

        this.clientProfesional.deleteProfesional(registroId).subscribe({
          next: finalizar,
          error: finalizar,
        });
      },
      error: () => {
        alert('Perfil actualizado, pero no se pudo quitar el perfil profesional.');
        this.router.navigate(['/perfil-user', userId]);
      },
    });
  }

handleSubmit() {
    if (this.form.pending) {
      alert('Esperá un momento, estamos verificando tus datos...');
      return;
    }
    if (this.form.invalid) {
      alert('Formulario invalido!');
      return;
    }

    const raw = this.form.getRawValue();
    const { password_repeat, ...rest } = raw;

    const user_data: User = {
      ...rest,
      dateOfBirth: new Date(rest.dateOfBirth),
      age: this.calcularEdad(rest.dateOfBirth),
    };

    if (this.editando) {
      if (!this.usuarioId) {
        alert('No se encontró el usuario a editar.');
        return;
      }
      if (!confirm('¿Guardar los cambios en tu perfil?')) {
        return;
      }

      const dejaDeSerProfesional = this.eraProfesional && !user_data.isProfesional;

      this.client.updateUser(this.usuarioId, { id: this.usuarioId, ...user_data }).subscribe(() => {
        if (dejaDeSerProfesional) {
          this.eliminarPerfilProfesional(this.usuarioId!);
        } else {
          alert('Perfil actualizado con éxito!');
          this.router.navigate(['/perfil-user', this.usuarioId]);
        }
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