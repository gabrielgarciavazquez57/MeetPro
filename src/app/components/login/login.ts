import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  get username() {
    return this.form.controls.username;
  }

  get password() {
    return this.form.controls.password;
  }

  handleSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    const { username, password } = this.form.getRawValue();

    this.auth.login(username.trim(), password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/profesionales-lista']);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        if (err.message === 'CREDENCIALES') {
          this.error.set('Usuario o contraseña incorrectos.');
          return;
        }
        console.error('Error al iniciar sesión:', err);
        this.error.set('No se pudo conectar con el servidor.');
      },
    });
  }
}
