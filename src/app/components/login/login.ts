import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClientUser } from '../../services/client-user';
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
  private readonly clientUser = inject(ClientUser);
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

    this.clientUser.getUsers().subscribe({
      next: (users) => {
        this.cargando.set(false);

        const user = users.find(
          (u) => u.username === username && u.password === password,
        );

        if (!user) {
          this.error.set('Usuario o contraseña incorrectos.');
          return;
        }

        this.auth.iniciarSesion(user);

        const ruta = user.isProfesional ? '/perfil-prof' : '/perfil-user';
        this.router.navigate([ruta, user.id]);
      },
      error: (err) => {
        console.error('Error al iniciar sesión:', err);
        this.cargando.set(false);
        this.error.set('No se pudo conectar con el servidor.');
      },
    });
  }
}
