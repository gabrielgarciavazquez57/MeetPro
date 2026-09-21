import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientUser } from '../../services/client-user'; // ajustá la ruta
import { ClientCuenta } from '../../services/client-cuenta';
import { Auth } from '../../services/auth';
import { User } from '../../interfaces/user'; // ajustá la ruta
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-perfil-user',
  standalone: true,
  imports: [BarraNav, RouterLink, DatePipe],
  templateUrl: './perfil-user.html',
  styleUrl: './perfil-user.css',
})
export class PerfilUser implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientUser = inject(ClientUser);
  private readonly clientCuenta = inject(ClientCuenta);
  private readonly auth = inject(Auth);

  usuario = signal<User | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error.set('No se especificó un ID de usuario.');
      this.cargando.set(false);
      return;
    }

    this.cargarUsuario(id);
  }

  cargarUsuario(id: string): void {
    this.cargando.set(true);
    this.error.set(null);

    this.clientUser.getUserByID(id).subscribe({
      next: (data) => {
        this.usuario.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer el usuario:', err);
        this.error.set('No se pudo cargar el usuario.');
        this.cargando.set(false);
      },
    });
  }

  eliminarPerfil(): void {
    const user = this.usuario();
    if (!user?.id || !confirm('¿Eliminar tu perfil? Se borran tu cuenta y todos tus datos (turnos, valoraciones, perfil profesional, etc.). Esta acción no se puede deshacer.')) {
      return;
    }

    const finalizar = () => {
      if (this.auth.usuario()?.id === user.id) {
        this.auth.cerrarSesion();
      }
      alert('Perfil eliminado.');
      this.router.navigate(['/']);
    };

    this.clientCuenta.eliminarCuenta(user).subscribe({
      next: finalizar,
      error: () => alert('No se pudo eliminar el perfil. Intentá de nuevo.'),
    });
  }
}