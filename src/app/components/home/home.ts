import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly auth = inject(Auth);

  readonly usuario = this.auth.usuario;

  /** Imágenes de fondo del home (en public/img/) */
  readonly imagenes = ['/img/home-1.jpg', '/img/home-2.jpg', '/img/home-3.jpg'];
  readonly slide = signal(0);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const id = setInterval(() => {
        this.slide.update((i) => (i + 1) % this.imagenes.length);
      }, 2000);
      inject(DestroyRef).onDestroy(() => clearInterval(id));
    }
  }
}
