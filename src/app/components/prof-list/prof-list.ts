import { Component, inject, signal, OnInit } from '@angular/core';
import { ClientProfesional } from '../../services/client-profesional'; // ajustá la ruta
import { Profesional } from '../../interfaces/profesional'; // ajustá la ruta
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-prof-list',
  standalone: true,
  imports: [BarraNav],
  templateUrl: './prof-list.html',
  styleUrl: './prof-list.css',
})
export class ProfList implements OnInit {
  private readonly clientProfesional = inject(ClientProfesional);

  profesionales = signal<Profesional[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarProfesionales();
  }

  cargarProfesionales(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.clientProfesional.getProfesionales().subscribe({
      next: (data) => {
        this.profesionales.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer profesionales:', err);
        this.error.set('No se pudieron cargar los profesionales.');
        this.cargando.set(false);
      },
    });
  }
}