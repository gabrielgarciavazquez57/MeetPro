import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientUser } from '../../services/client-user'; // ajustá la ruta
import { User } from '../../interfaces/user'; // ajustá la ruta

@Component({
  selector: 'app-perfil-user',
  standalone: true,
  imports: [],
  templateUrl: './perfil-user.html',
  styleUrl: './perfil-user.css',
})
export class PerfilUser implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientUser = inject(ClientUser);

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
}