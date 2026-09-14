import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { Auth } from '../../services/auth';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import { FormularioContenido } from '../formulario-contenido/formulario-contenido';

@Component({
  selector: 'app-contenido-cliente-profesional',
  standalone: true,
  imports: [BarraNav, FormularioContenido],
  templateUrl: './contenido-cliente-profesional.html',
  styleUrl: './contenido-cliente-profesional.css',
})
export class ContenidoClienteProfesional implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly auth = inject(Auth);

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Modal de "Agregar contenido" abierto ('profesional' | 'cliente' | null) */
  readonly formularioAbierto = signal<'profesional' | 'cliente' | null>(null);

  abrirFormulario(tipo: 'profesional' | 'cliente'): void {
    this.formularioAbierto.set(tipo);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(null);
  }

  readonly nombreProfesional = computed(() => {
    const u = this.profesional()?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : '';
  });

  /** Solo el profesional dueño de este perfil puede publicar contenido para sus clientes */
  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const u = this.profesional()?.profesional_userData;
    return !!logueado && !!u && String(logueado.id) === String(u.id);
  });

  /** Cualquier usuario logueado que no sea el profesional dueño puede agregar contenido como cliente */
  readonly esCliente = computed(() => !!this.auth.usuario() && !this.esDueno());

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    this.cargarProfesional();
  }

  private cargarProfesional(): void {
    this.cargando.set(true);
    this.error.set(null);

    const id = this.profesionalId();
    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => {
        this.profesional.set(lista.find((p) => p.professionalId === id) ?? null);
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
