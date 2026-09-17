import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientContenido } from '../../services/client-contenido';
import { Auth } from '../../services/auth';
import { Profesional } from '../../interfaces/profesional';
import { ContenidoProfesionalCliente } from '../../interfaces/contenido-profesional-cliente';
import { BarraNav } from '../barra-nav/barra-nav';
import { FormularioContenido } from '../formulario-contenido/formulario-contenido';

@Component({
  selector: 'app-contenido-cliente-profesional',
  standalone: true,
  imports: [BarraNav, FormularioContenido, RouterLink],
  templateUrl: './contenido-cliente-profesional.html',
  styleUrl: './contenido-cliente-profesional.css',
})
export class ContenidoClienteProfesional implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientContenido = inject(ClientContenido);
  private readonly auth = inject(Auth);

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly contenidoProfesional = signal<ContenidoProfesionalCliente[]>([]);
  readonly contenidoCliente = signal<ContenidoProfesionalCliente[]>([]);

  /** Modal de "Agregar/editar contenido" abierto ('profesional' | 'cliente' | null) */
  readonly formularioAbierto = signal<'profesional' | 'cliente' | null>(null);
  /** Contenido que se está editando (null = alta de contenido nuevo) */
  readonly contenidoEditar = signal<ContenidoProfesionalCliente | null>(null);

  abrirFormulario(tipo: 'profesional' | 'cliente'): void {
    this.contenidoEditar.set(null);
    this.formularioAbierto.set(tipo);
  }

  editarContenido(item: ContenidoProfesionalCliente): void {
    this.contenidoEditar.set(item);
    this.formularioAbierto.set(item.tipo);
  }

  eliminarContenido(id: string | number | undefined): void {
    if (id == null) {
      return;
    }
    if (!confirm('¿Eliminar este contenido?')) {
      return;
    }
    this.clientContenido.deleteContenido(id).subscribe(() => this.cargarContenido());
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(null);
    this.contenidoEditar.set(null);
  }

  /** Se llama cuando el modal guarda contenido con éxito: cierra y refresca las listas */
  onContenidoGuardado(): void {
    this.cerrarFormulario();
    this.cargarContenido();
  }

  readonly nombreProfesional = computed(() => {
    const u = this.profesional()?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : '';
  });

  /** ID del usuario dueño del perfil profesional (para "Volver atrás") */
  readonly profesionalUsuarioId = computed(() => this.profesional()?.profesional_userData?.id ?? null);

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
    this.cargarContenido();
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

  private cargarContenido(): void {
    const id = this.profesionalId();
    if (!id) {
      return;
    }

    this.clientContenido.getContenido().subscribe({
      next: (lista) => {
        const delProfesional = lista.filter((c) => String(c.professionalId) === String(id));
        this.contenidoProfesional.set(delProfesional.filter((c) => c.tipo === 'profesional'));
        this.contenidoCliente.set(delProfesional.filter((c) => c.tipo === 'cliente'));
      },
      error: (err) => console.error('Error al traer el contenido:', err),
    });
  }
}
