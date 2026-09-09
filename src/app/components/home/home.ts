import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { ClientUser } from '../../services/client-user';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly clientUser = inject(ClientUser);
  private readonly router = inject(Router);

  readonly usuario = this.auth.usuario;

  /** Vista dentro del contenedor: bienvenida o formulario de login */
  readonly vista = signal<'inicio' | 'login'>('inicio');

  // ===== Slideshow de fondo =====
  readonly imagenes = ['/img/home-1.webp', '/img/home-2.jpg', '/img/home-3.jpg'];
  readonly slide = signal(0);

  // ===== Login inline =====
  readonly loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });
  readonly loginCargando = signal(false);
  readonly loginError = signal<string | null>(null);

  get lUsername() {
    return this.loginForm.controls.username;
  }

  get lPassword() {
    return this.loginForm.controls.password;
  }

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const id = setInterval(() => {
        this.slide.update((i) => (i + 1) % this.imagenes.length);
      }, 2000);
      inject(DestroyRef).onDestroy(() => clearInterval(id));
    }
  }

  abrirLogin(): void {
    this.loginError.set(null);
    this.vista.set('login');
  }

  volverInicio(): void {
    this.vista.set('inicio');
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loginCargando.set(true);
    this.loginError.set(null);

    const { username, password } = this.loginForm.getRawValue();

    this.clientUser.getUsers().subscribe({
      next: (users) => {
        this.loginCargando.set(false);

        const user = users.find(
          (u) => u.username === username && u.password === password,
        );

        if (!user) {
          this.loginError.set('Usuario o contraseña incorrectos.');
          return;
        }

        this.auth.iniciarSesion(user);
        this.router.navigate(['/profesionales-lista']);
      },
      error: (err) => {
        console.error('Error al iniciar sesión:', err);
        this.loginCargando.set(false);
        this.loginError.set('No se pudo conectar con el servidor.');
      },
    });
  }
}
