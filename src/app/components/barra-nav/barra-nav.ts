import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-barra-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-nav.html',
  styleUrl: './barra-nav.css',
})
export class BarraNav {
  private readonly auth = inject(Auth);

  /** Título de la sub-barra */
  titulo = input<string>('Perfil Profesional');

  /** Ruta al perfil del usuario logueado (o al login si no hay sesión) */
  readonly perfilRuta = computed(() => {
    const u = this.auth.usuario();
    if (!u) {
      return ['/login'];
    }
    return ['/perfil-user', u.id];
  });

  /** Iniciales del usuario logueado para el avatar */
  readonly iniciales = computed(() => {
    const u = this.auth.usuario();
    if (!u) {
      return '';
    }
    return `${u.name?.charAt(0) ?? ''}${u.lastname?.charAt(0) ?? ''}`.toUpperCase();
  });
}
