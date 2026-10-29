import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';
import { formatearTelefono } from '../../shared/codigos-pais';
import { Auth } from '../../services/auth';
import { ClientValoracion } from '../../services/client-valoracion';
import { Valoracion } from '../../interfaces/valoracion';

@Component({
  selector: 'app-perfil-profesional',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './perfil-prof.html',
  styleUrl: './perfil-prof.css',
})
export class PerfilProfesional implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly auth = inject(Auth);
  private readonly clientValoracion = inject(ClientValoracion);

  protected readonly formatearTelefono = formatearTelefono;

  profesional = signal<Profesional | null>(null);
  private readonly valoraciones = signal<Valoracion[]>([]);

  readonly cantidadValoraciones = computed(() => this.valoraciones().length);

  /** Promedio de puntaje con coma decimal (por ejemplo "4,5"), o null si no hay valoraciones */
  readonly promedioTexto = computed(() => {
    const lista = this.valoraciones();
    if (!lista.length) {
      return null;
    }
    const promedio = lista.reduce((suma, v) => suma + v.puntaje, 0) / lista.length;
    return (Math.round(promedio * 10) / 10).toLocaleString('es-AR');
  });

  /** Precio mensual con formato de pesos (por ejemplo "$ 7.500"), o null si no cargó uno */
  readonly precioTexto = computed(() => {
    const precio = this.profesional()?.pago?.precio;
    if (typeof precio !== 'number' || precio <= 0) {
      return null;
    }
    return precio.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  });
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  /** Solo el profesional dueño de este perfil ve sus propios accesos (clientes, pagos) */
  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const u = this.profesional()?.profesional_userData;
    return !!logueado && !!u && String(logueado.id) === String(u.id);
  });

  /** Panel flotante abierto: 'titulos', 'experiencias', 'beneficios' o null */
  panel = signal<'titulos' | 'experiencias' | 'beneficios' | null>(null);

  /** Lo que un cliente obtiene al contratar al profesional, mostrado en el panel "Beneficios" */
  protected readonly beneficios = [
    { titulo: 'Turnos online', descripcion: 'Reservá una consulta virtual desde donde estés.' },
    { titulo: 'Turnos presenciales', descripcion: 'Coordiná un encuentro en persona con el profesional.' },
    { titulo: 'Contenido cliente-profesional', descripcion: 'Intercambien material y avances privados de la consulta.' },
    { titulo: 'Contenido extra', descripcion: 'Próximamente disponible.' },
  ];

  togglePanel(seccion: 'titulos' | 'experiencias' | 'beneficios'): void {
    this.panel.update((actual) => (actual === seccion ? null : seccion));
  }

  cerrarPanel(): void {
    this.panel.set(null);
  }

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
          this.clientValoracion.getValoracionesByProfesional(data[0].professionalId).subscribe({
            next: (lista) => this.valoraciones.set(lista),
            error: () => this.valoraciones.set([]),
          });
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