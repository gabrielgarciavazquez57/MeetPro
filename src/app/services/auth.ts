import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { defer, map, Observable, switchMap, tap, throwError } from 'rxjs';
import { User } from '../interfaces/user';
import { ClientUser } from './client-user';
import { SupabaseDb } from './supabase-db';

const STORAGE_KEY = 'meetpro_usuario';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly db = inject(SupabaseDb);
  private readonly clientUser = inject(ClientUser);

  /** Usuario que inició sesión (null si no hay sesión) */
  readonly usuario = signal<User | null>(this.leerStorage());

  constructor() {
    if (!this.esNavegador) {
      return;
    }
    // La sesión real es la de Supabase: si venció o se cerró en otra pestaña, se limpia la copia local
    this.db.client.auth.getSession().then(({ data }) => {
      if (!data.session && this.usuario()) {
        this.limpiar();
      }
    });
    this.db.client.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT' && this.usuario()) {
        this.limpiar();
      }
    });
  }

  /** Inicia sesión con username y contraseña. Falla con 'CREDENCIALES' si no coinciden */
  login(username: string, password: string): Observable<User> {
    return this.db.rpc<string | null>('email_de_usuario', { p_username: username }).pipe(
      switchMap((email) =>
        email
          ? defer(() => this.db.client.auth.signInWithPassword({ email, password }))
          : throwError(() => new Error('CREDENCIALES')),
      ),
      switchMap(({ data, error }) => {
        if (error || !data.user) {
          return throwError(() => new Error('CREDENCIALES'));
        }
        return this.clientUser.getUserByAuthId(data.user.id);
      }),
      map((perfil) => {
        if (!perfil) {
          throw new Error('CREDENCIALES');
        }
        return perfil;
      }),
      tap((perfil) => this.iniciarSesion(perfil)),
    );
  }

  /**
   * Crea la cuenta de Auth. Devuelve el id de la cuenta.
   * Falla con 'CONFIRMAR_EMAIL' si el proyecto exige confirmar el correo antes de iniciar sesión.
   */
  registrar(email: string, password: string): Observable<string> {
    return defer(() => this.db.client.auth.signUp({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        if (!data.session || !data.user) {
          throw new Error('CONFIRMAR_EMAIL');
        }
        return data.user.id;
      }),
    );
  }

  cambiarPassword(password: string): Observable<void> {
    return defer(() => this.db.client.auth.updateUser({ password })).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
      }),
    );
  }

  iniciarSesion(user: User): void {
    this.usuario.set(user);
    if (this.esNavegador) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }

  cerrarSesion(): void {
    this.limpiar();
    if (this.esNavegador) {
      this.db.client.auth.signOut();
    }
  }

  private limpiar(): void {
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
