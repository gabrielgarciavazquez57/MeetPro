import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-barra-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-nav.html',
  styleUrl: './barra-nav.css',
})
export class BarraNav {
  /** Título de la sub-barra */
  titulo = input<string>('Perfil Profesional');
}
