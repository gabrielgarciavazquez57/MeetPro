import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../interfaces/user';

const STORAGE_KEY = 'meetpro_usuario';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Usuario que inició sesión (null si no hay sesión) */
  readonly usuario = signal<User | null>(this.leerStorage());

  iniciarSesion(user: User): void {
    this.usuario.set(user);
    if (this.esNavegador) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }

  cerrarSesion(): void {
    this.usuario.set(null);
    if (this.esNavegador) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private leerStorage(): User | null {
    if (!this.esNavegador) {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
