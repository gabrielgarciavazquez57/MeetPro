import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientProfesional } from '../../services/client-profesional'; // ajustá la ruta
import { Profesional } from '../../interfaces/profesional'; // ajustá la ruta
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

  profesionales = signal<Profesional[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  // ===== Filtros =====
  paisFiltro = signal('');
  ciudadFiltro = signal('');
  profesionFiltro = signal('');
  idFiltro = signal('');
  nombreFiltro = signal('');

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

    return this.profesionales().filter((p) => {
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
