import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, AbstractControl, AsyncValidatorFn, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { catchError, map, of, switchMap } from 'rxjs';
import { User } from '../../interfaces/user';
import { ClientUser } from '../../services/client-user';
import { ClientProfesional } from '../../services/client-profesional';
import { Auth } from '../../services/auth';
import { Desplegable } from '../desplegable/desplegable';
import { CodigoTelefono } from '../codigo-telefono/codigo-telefono';
import { CIUDADES_ARGENTINA, PROVINCIAS_ARGENTINA } from '../../shared/ciudades-argentina';
import { CODIGO_PAIS_DEFECTO, separarTelefono } from '../../shared/codigos-pais';
import { countries, type ICountry } from 'countries-list';
import { ToastService } from '../../services/toast';
import { ConfirmacionService } from '../../services/confirmacion';

const OTRA_CIUDAD = 'Otra ciudad...';

function passwordsIguales(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const repeat = control.get('password_repeat')?.value;
  return password === repeat ? null : { passwordsNoCoinciden: true };
}

/** Exige al menos una mayúscula, un número y un carácter especial */
function passwordSegura(control: AbstractControl): ValidationErrors | null {
  const valor: string = control.value ?? '';
  if (!valor) return null;
  const errores: ValidationErrors = {};
  if (!/[A-ZÁÉÍÓÚÑ]/.test(valor)) errores['sinMayuscula'] = true;
  if (!/[0-9]/.test(valor)) errores['sinNumero'] = true;
  if (!/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(valor)) errores['sinEspecial'] = true;
  return Object.keys(errores).length ? errores : null;
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
  imports: [ReactiveFormsModule, Desplegable, CodigoTelefono],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly fb = inject(FormBuilder);
  protected readonly client = inject(ClientUser);
  protected readonly clientProfesional = inject(ClientProfesional);
  private readonly auth = inject(Auth);
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

  /** Código de país del teléfono (ej. "+54"); el número en sí vive en el control phoneNumber */
  readonly codigoTelefono = signal<string>(CODIGO_PAIS_DEFECTO);

  /** Verifica contra el backend que el username no pertenezca a otro usuario */
  private readonly usernameDuplicadoValidator: AsyncValidatorFn = (control: AbstractControl) => {
    const username = (control.value ?? '').trim();
    if (!username) {
      return of(null);
    }
    return this.client.datosDisponibles({ username }, this.usuarioId).pipe(
      map((d) => (d.username ? null : { usernameDuplicado: true })),
      catchError(() => of(null)),
    );
  };

  /** Verifica contra el backend que el DNI no pertenezca a otro usuario */
  private readonly dniDuplicadoValidator: AsyncValidatorFn = (control: AbstractControl) => {
    const dni = (control.value ?? '').trim();
    if (!dni) {
      return of(null);
    }
    return this.client.datosDisponibles({ dni }, this.usuarioId).pipe(
      map((d) => (d.dni ? null : { dniDuplicado: true })),
      catchError(() => of(null)),
    );
  };

  /** Verifica contra el backend que el email no pertenezca a otro usuario */
  private readonly emailDuplicadoValidator: AsyncValidatorFn = (control: AbstractControl) => {
    const email = (control.value ?? '').trim();
    if (!email) {
      return of(null);
    }
    return this.client.datosDisponibles({ email }, this.usuarioId).pipe(
      map((d) => (d.email ? null : { emailDuplicado: true })),
      catchError(() => of(null)),
    );
  };

  protected readonly tipos_gen = ['Masculino', 'Femenino', 'No especifico'] as const;
  protected readonly paises = Object.values(countries)
    .map(c => (c as ICountry).name)
    .sort();

  protected readonly form = this.fb.nonNullable.group({
    username:        ['', [Validators.required, Validators.minLength(5), Validators.maxLength(10)], [this.usernameDuplicadoValidator]],
    password:        ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15), passwordSegura]],
    password_repeat: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]],
    isProfesional:   [false, [Validators.required]],
    isAdmin:         [false],
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

  constructor() {
    if (this.editando) {
      this.form.controls.password.removeValidators(Validators.required);
      this.form.controls.password_repeat.removeValidators(Validators.required);
      this.form.controls.password.updateValueAndValidity();
      this.form.controls.password_repeat.updateValueAndValidity();
    }
  }

  protected readonly provinciasArgentina = PROVINCIAS_ARGENTINA;

  /** true cuando el país elegido es Argentina: provincia y ciudad pasan a ser listas desplegables */
  protected readonly esArgentina = toSignal(
    this.form.controls.address.controls.country.valueChanges.pipe(map((pais) => pais === 'Argentina')),
    { initialValue: false },
  );

  private readonly provinciaActual = toSignal(this.form.controls.address.controls.province.valueChanges, {
    initialValue: '',
  });
  protected readonly ciudadActual = toSignal(this.form.controls.address.controls.city.valueChanges, {
    initialValue: '',
  });

  /** El usuario eligió "Otra ciudad..." y escribe la suya a mano */
  protected readonly ciudadOtra = signal(false);

  protected readonly ciudadesDisponibles = computed(() =>
    this.esArgentina() ? (CIUDADES_ARGENTINA[this.provinciaActual()] ?? []) : [],
  );

  /** Ciudad guardada que no figura en la lista (datos viejos): se agrega como opción para no perderla */
  protected readonly ciudadFueraDeLista = computed(() => {
    const actual = this.ciudadActual();
    return actual !== '' && !this.ciudadOtra() && !this.ciudadesDisponibles().includes(actual);
  });

  /** Opciones del desplegable: la ciudad guardada fuera de lista (si hay), la lista de la provincia y "Otra ciudad..." */
  protected readonly opcionesCiudad = computed(() => [
    ...(this.ciudadFueraDeLista() ? [this.ciudadActual()] : []),
    ...this.ciudadesDisponibles(),
    OTRA_CIUDAD,
  ]);

  protected readonly valorCiudad = computed(() => (this.ciudadOtra() ? OTRA_CIUDAD : this.ciudadActual()));

  /** Al cambiar el país a mano: si la provincia escrita no es una de la lista, se limpia (y la ciudad) */
  onPaisChange(): void {
    this.ciudadOtra.set(false);
    const provincias: readonly string[] = this.provinciasArgentina;
    if (this.country.value === 'Argentina' && !provincias.includes(this.province.value)) {
      this.province.setValue('');
      this.city.setValue('');
    }
  }

  /** Al cambiar la provincia de la lista, las ciudades cambian: se limpia la ciudad elegida */
  onProvinciaChange(): void {
    this.ciudadOtra.set(false);
    this.city.setValue('');
  }

  elegirCiudad(valor: string): void {
    this.city.markAsDirty();
    if (valor === OTRA_CIUDAD) {
      this.city.setValue('');
      this.ciudadOtra.set(true);
      return;
    }
    this.city.setValue(valor);
  }

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
  protected readonly pasos = ['Datos personales', 'Dirección', 'Cuenta'] as const;
  readonly direccionPaso = signal<'izq' | 'der'>('der');

  irAPaso(paso: number): void {
    if (paso === this.pasoActual()) {
      return;
    }
    this.direccionPaso.set(paso > this.pasoActual() ? 'der' : 'izq');
    this.pasoActual.set(paso);
  }

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
      this.toast.mostrar('No se encontró el usuario a editar.');
      this.router.navigate(['/']);
      return;
    }

    this.client.getUserByID(id).subscribe({
      next: (user) => {
        this.usuarioId = user.id ?? id;
        this.eraProfesional = user.isProfesional === true;
        this.fotoPreview.set(user.fotoPerfil ?? '');
        const { codigo, numero } = separarTelefono(user.phoneNumber);
        this.codigoTelefono.set(codigo);
        this.form.patchValue({
          ...user,
          phoneNumber: numero,
          dateOfBirth: this.aFechaInput(user.dateOfBirth),
        });
      },
      error: () => {
        this.toast.mostrar('No se pudo cargar el usuario.');
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
          this.toast.mostrar('Perfil actualizado. Se quitó tu perfil profesional.');
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
        this.toast.mostrar('Perfil actualizado, pero no se pudo quitar el perfil profesional.');
        this.router.navigate(['/perfil-user', userId]);
      },
    });
  }

handleSubmit() {
    if (this.form.pending) {
      this.toast.mostrar('Esperá un momento, estamos verificando tus datos...');
      return;
    }
    if (this.form.invalid) {
      this.toast.mostrar('Revisá los campos del formulario.', 'error');
      return;
    }

    const raw = this.form.getRawValue();
    const { password_repeat, ...rest } = raw;

    const user_data: User = {
      ...rest,
      phoneNumber: `${this.codigoTelefono()} ${rest.phoneNumber.trim()}`,
      dateOfBirth: new Date(rest.dateOfBirth),
      age: this.calcularEdad(rest.dateOfBirth),
    };

    if (this.editando) {
      if (!this.usuarioId) {
        this.toast.mostrar('No se encontró el usuario a editar.');
        return;
      }
      this.confirmacion.pedir({ titulo: 'Guardar cambios', mensaje: '¿Guardar los cambios en tu perfil?', aceptar: 'Guardar' }).then((confirmado) => {
      if (!confirmado) {
        return;
      }

      const dejaDeSerProfesional = this.eraProfesional && !user_data.isProfesional;

      const nuevaPassword = rest.password;
      const esPropio = String(this.auth.usuario()?.id) === String(this.usuarioId);
      const cambioPassword$ = nuevaPassword && esPropio ? this.auth.cambiarPassword(nuevaPassword) : of(undefined);

      cambioPassword$
        .pipe(switchMap(() => this.client.updateUser(this.usuarioId!, { id: this.usuarioId!, ...user_data })))
        .subscribe({
          next: () => {
            if (dejaDeSerProfesional) {
              this.eliminarPerfilProfesional(this.usuarioId!);
              return;
            }
            this.toast.mostrar(
              nuevaPassword && !esPropio
                ? 'Perfil actualizado. La contraseña de otro usuario no se puede cambiar desde acá.'
                : 'Perfil actualizado con éxito!',
            );
            this.router.navigate(['/perfil-user', this.usuarioId]);
          },
          error: () => this.toast.mostrar('No se pudo actualizar el perfil. Intentá de nuevo.'),
        });
      });
      return;
    }

    this.confirmacion.pedir({ titulo: 'Registrar usuario', mensaje: '¿Desea registrar este usuario?', aceptar: 'Registrar' }).then((confirmado) => {
      if (!confirmado) {
        return;
      }
      this.auth
        .registrar(user_data.email.trim(), rest.password)
        .pipe(switchMap((authId) => this.client.addUser({ ...user_data, isAdmin: false, auth_id: authId })))
        .subscribe({
          next: (createdUser) => {
            this.auth.iniciarSesion(createdUser);
            this.toast.mostrar('Te registraste con éxito. ¡Bienvenido a MeetPro!', 'exito');
            this.form.reset();

            if (user_data.isProfesional) {
              this.router.navigate(['/CreateProfesional', createdUser.id]);
            } else {
              this.router.navigate(['/profesionales-lista']);
            }
          },
          error: (err: Error) => {
            if (err.message === 'CONFIRMAR_EMAIL') {
              this.toast.mostrar('Te enviamos un email para confirmar la cuenta. Confirmalo e iniciá sesión.');
              this.router.navigate(['/login']);
              return;
            }
            this.toast.mostrar('No se pudo completar el registro: ' + err.message);
          },
        });
    });
  }
}