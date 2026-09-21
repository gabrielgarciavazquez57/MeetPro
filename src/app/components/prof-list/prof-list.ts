import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { countries, type ICountry } from 'countries-list';
import { ClientProfesional } from '../../services/client-profesional'; // ajustá la ruta
import { ClientValoracion } from '../../services/client-valoracion';
import { ClientUser } from '../../services/client-user';
import { Profesional } from '../../interfaces/profesional'; // ajustá la ruta
import { Valoracion } from '../../interfaces/valoracion';
import { BarraNav } from '../barra-nav/barra-nav';
import { Desplegable } from '../desplegable/desplegable';
import { CIUDADES_ARGENTINA, PROVINCIAS_ARGENTINA } from '../../shared/ciudades-argentina';

/** Para comparar sin importar mayúsculas, acentos ni espacios sobrantes */
const normalizar = (texto: string | undefined) =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Igual que normalizar, y trata a "CABA" como la Ciudad Autónoma de Buenos Aires */
const normalizarCiudad = (texto: string | undefined) => {
  const ciudad = normalizar(texto);
  return ciudad === 'caba' ? 'ciudad autonoma de buenos aires' : ciudad;
};

@Component({
  selector: 'app-prof-list',
  standalone: true,
  imports: [BarraNav, FormsModule, Desplegable],
  templateUrl: './prof-list.html',
  styleUrl: './prof-list.css',
})
export class ProfList implements OnInit {
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientValoracion = inject(ClientValoracion);
  private readonly clientUser = inject(ClientUser);

  profesionales = signal<Profesional[]>([]);
  valoraciones = signal<Valoracion[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  /** Promedio de puntaje por professionalId (0 si no tiene valoraciones) */
  readonly promedios = computed(() => {
    const acumulado = new Map<string, { suma: number; total: number }>();
    for (const v of this.valoraciones()) {
      const key = String(v.professionalId);
      const actual = acumulado.get(key) ?? { suma: 0, total: 0 };
      actual.suma += v.puntaje ?? 0;
      actual.total += 1;
      acumulado.set(key, actual);
    }
    const mapa = new Map<string, number>();
    for (const [key, { suma, total }] of acumulado) {
      mapa.set(key, Math.round((suma / total) * 10) / 10);
    }
    return mapa;
  });

  promedioDe(professionalId: string | undefined): number {
    return this.promedios().get(String(professionalId)) ?? 0;
  }

  // ===== Filtros =====
  paisFiltro = signal('');
  provinciaFiltro = signal('');
  ciudadFiltro = signal('');
  profesionFiltro = signal('');
  idFiltro = signal('');
  nombreFiltro = signal('');
  ordenValoracion = signal<'' | 'desc' | 'asc'>('');

  /** Todos los países (los mismos que ofrece el formulario de registro) */
  readonly paises = Object.values(countries)
    .map((c) => (c as ICountry).name)
    .sort((a, b) => a.localeCompare(b, 'es'));

  /** Provincias argentinas: el filtro solo se muestra con Argentina como país */
  readonly provincias = PROVINCIAS_ARGENTINA;

  /** Ciudades de la provincia elegida (las mismas que ofrece el formulario de registro) */
  readonly ciudades = computed(() => CIUDADES_ARGENTINA[this.provinciaFiltro()] ?? []);

  readonly profesionalesFiltrados = computed(() => {
    const pais = this.paisFiltro();
    const provincia = normalizar(this.provinciaFiltro());
    const ciudad = this.ciudadFiltro();
    const profesion = this.profesionFiltro().trim().toLowerCase();
    const id = this.idFiltro().trim().toLowerCase();
    const nombre = this.nombreFiltro().trim().toLowerCase();

    const filtrados = this.profesionales().filter((p) => {
      const addr = p.profesional_userData?.address;
      const nombreCompleto = `${p.profesional_userData?.name ?? ''} ${p.profesional_userData?.lastname ?? ''}`
        .toLowerCase()
        .trim();
      if (pais && addr?.country !== pais) return false;
      if (provincia && normalizar(addr?.province) !== provincia) return false;
      if (ciudad && normalizarCiudad(addr?.city) !== normalizarCiudad(ciudad)) return false;
      if (profesion && !(p.profession ?? '').toLowerCase().includes(profesion)) return false;
      if (id && !String(p.professionalId ?? '').toLowerCase().includes(id)) return false;
      if (nombre && !nombreCompleto.includes(nombre)) return false;
      return true;
    });

    const orden = this.ordenValoracion();
    if (orden) {
      return [...filtrados].sort((a, b) => {
        const diff = this.promedioDe(a.professionalId) - this.promedioDe(b.professionalId);
        return orden === 'asc' ? diff : -diff;
      });
    }

    return filtrados;
  });

  readonly hayFiltros = computed(
    () =>
      !!this.paisFiltro() ||
      !!this.provinciaFiltro() ||
      !!this.ciudadFiltro() ||
      !!this.profesionFiltro().trim() ||
      !!this.idFiltro().trim() ||
      !!this.nombreFiltro().trim(),
  );

  limpiarFiltros(): void {
    this.paisFiltro.set('');
    this.provinciaFiltro.set('');
    this.ciudadFiltro.set('');
    this.profesionFiltro.set('');
    this.idFiltro.set('');
    this.nombreFiltro.set('');
  }

  onPaisChange(valor: string): void {
    this.paisFiltro.set(valor);
    this.provinciaFiltro.set('');
    this.ciudadFiltro.set('');
  }

  onProvinciaChange(valor: string): void {
    this.provinciaFiltro.set(valor);
    this.ciudadFiltro.set('');
  }

  ngOnInit(): void {
    this.cargarProfesionales();
    this.cargarValoraciones();
  }

  cargarValoraciones(): void {
    this.clientValoracion.getValoraciones().subscribe({
      next: (data) => this.valoraciones.set(data),
      error: (err) => console.error('Error al traer valoraciones:', err),
    });
  }

  cargarProfesionales(): void {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      profesionales: this.clientProfesional.getProfesionales(),
      usuarios: this.clientUser.getUsers(),
    }).subscribe({
      next: ({ profesionales, usuarios }) => {
        const idsAdmin = new Set(
          usuarios.filter((u) => u.isAdmin).map((u) => String(u.id)),
        );
        const idsUsuarios = new Set(usuarios.map((u) => String(u.id)));
        this.profesionales.set(
          profesionales.filter((p) => {
            const userId = String(p.profesional_userData?.id);
            // Se ocultan los admins y los perfiles cuyo usuario ya fue eliminado
            return idsUsuarios.has(userId) && !idsAdmin.has(userId);
          }),
        );
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
