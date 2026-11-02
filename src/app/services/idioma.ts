import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { fijarIdioma, Idioma } from '../shared/idioma-actual';
import { TraductorDom } from '../shared/traductor-dom';

const STORAGE_KEY = 'meetpro_idioma';

@Injectable({
  providedIn: 'root',
})
export class IdiomaService {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly traductor = this.esNavegador ? new TraductorDom() : null;

  /** Idioma de la interfaz: español (el original) o inglés */
  readonly idioma = signal<Idioma>(this.leer());

  constructor() {
    fijarIdioma(this.idioma());
    effect(() => {
      const idioma = this.idioma();
      fijarIdioma(idioma);
      if (!this.esNavegador) {
        return;
      }
      document.documentElement.lang = idioma;
      if (idioma === 'en') {
        this.traductor?.activar();
      } else {
        this.traductor?.desactivar();
      }
      try {
        localStorage.setItem(STORAGE_KEY, idioma);
      } catch {
        // sin almacenamiento: el idioma vale solo para esta visita
      }
    });
  }

  alternar(): void {
    this.idioma.update((actual) => (actual === 'es' ? 'en' : 'es'));
  }

  private leer(): Idioma {
    if (!this.esNavegador) {
      return 'es';
    }
    try {
      return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es';
    } catch {
      return 'es';
    }
  }
}
