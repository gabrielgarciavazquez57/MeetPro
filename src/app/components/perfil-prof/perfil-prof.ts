import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { Profesional } from '../../interfaces/profesional';

@Component({
  selector: 'app-perfil-profesional',
  standalone: true,
  imports: [],
  templateUrl: './perfil-prof.html',
  styleUrl: './perfil-prof.css',
})
export class PerfilProfesional implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);

  profesional = signal<Profesional | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');

    if (!userId) {
      this.error.set('No se especificó un ID de usuario.');
      this.cargando.set(false);
      return;
    }

    this.cargarProfesional(userId);
  }

  cargarProfesional(userId: string): void {
    this.cargando.set(true);
    this.error.set(null);

    this.clientProfesional.getProfesionalByUserID(userId).subscribe({
      next: (data) => {
        if (data.length === 0) {
          this.error.set('No se encontró un profesional para este usuario.');
          this.profesional.set(null);
        } else {
          this.profesional.set(data[0]);
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer el profesional:', err);
        this.error.set('No se pudo cargar el profesional.');
        this.cargando.set(false);
      },
    });
  }
}