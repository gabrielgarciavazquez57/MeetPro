import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientProfesional } from '../../services/client-profesional'; // ajustá la ruta
import { ClientValoracion } from '../../services/client-valoracion';
import { Profesional } from '../../interfaces/profesional'; // ajustá la ruta
import { Valoracion } from '../../interfaces/valoracion';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-prof-list',
  standalone: true,
  imports: [BarraNav, FormsModule],
  templateUrl: './prof-list.html',
  styleUrl: './prof-list.css',
})
export class ProfList implements OnInit {
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientValoracion = inject(ClientValoracion);

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
  ciudadFiltro = signal('');
  profesionFiltro = signal('');
  idFiltro = signal('');
  nombreFiltro = signal('');
  ordenValoracion = signal<'' | 'desc' | 'asc'>('');

  readonly paises = computed(() => {
    const set = new Set<string>();
    for (const p of this.profesionales()) {
      const c = p.profesional_userData?.address?.country;
      if (c) set.add(c);
    }
    return [...set].sort();
  });

  readonly ciudades = computed(() => {
    const pais = this.paisFiltro();
    const set = new Set<string>();
    for (const p of this.profesionales()) {
      const addr = p.profesional_userData?.address;
      if (pais && addr?.country !== pais) continue;
      if (addr?.city) set.add(addr.city);
    }
    return [...set].sort();
  });

  readonly profesionalesFiltrados = computed(() => {
    const pais = this.paisFiltro();
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
      if (ciudad && addr?.city !== ciudad) return false;
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
      !!this.ciudadFiltro() ||
      !!this.profesionFiltro().trim() ||
      !!this.idFiltro().trim() ||
      !!this.nombreFiltro().trim(),
  );

  limpiarFiltros(): void {
    this.paisFiltro.set('');
    this.ciudadFiltro.set('');
    this.profesionFiltro.set('');
    this.idFiltro.set('');
    this.nombreFiltro.set('');
  }

  onPaisChange(valor: string): void {
    this.paisFiltro.set(valor);
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
