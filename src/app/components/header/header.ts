import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { NotificacionesService } from '../../services/notificaciones';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(NotificacionesService);

  readonly usuario = this.auth.usuario;
  readonly noLeidas = this.notificaciones.noLeidas;

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }
}