import { Component, PLATFORM_ID, computed, inject, signal, OnInit } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Auth } from '../../services/auth';
import { ClientConsulta } from '../../services/client-consulta';
import { ClientProfesional } from '../../services/client-profesional';
import { Consulta } from '../../interfaces/consulta';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';

type Pestana = 'recibidas' | 'enviadas';

@Component({
  selector: 'app-lista-consultas',
  standalone: true,
  imports: [BarraNav, RouterLink],
  templateUrl: './lista-consultas.html',
  styleUrls: ['../../shared/turnos.css', './lista-consultas.css'],
})
export class ListaConsultas implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly clientConsulta = inject(ClientConsulta);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly consultas = signal<Consulta[]>([]);
  readonly profesionales = signal<Profesional[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly pestana = signal<Pestana>('enviadas');

  /** Respuestas que el profesional está escribiendo, por id de consulta */
  readonly borradores = signal<Record<string, string>>({});
  readonly enviando = signal<string | null>(null);

  /** Matrícula del profesional logueado (null si no tiene perfil profesional) */
  readonly miMatricula = computed(() => {
    const uid = String(this.auth.usuario()?.id);
    return this.profesionales().find((p) => String(p.profesional_userData?.id) === uid)?.professionalId ?? null;
  });
  readonly esProfesional = computed(() => this.miMatricula() !== null);

  readonly recibidas = computed(() => {
    const mat = this.miMatricula();
    return mat ? this.ordenar(this.consultas().filter((c) => String(c.professionalId) === String(mat))) : [];
  });

  readonly enviadas = computed(() => {
    const uid = String(this.auth.usuario()?.id);
    return this.ordenar(this.consultas().filter((c) => String(c.userId) === uid));
  });

  readonly sinResponder = computed(() => this.recibidas().filter((c) => !c.respuesta).length);

  ngOnInit(): void {
    if (!this.esNavegador) {
      return;
    }
    if (!this.auth.usuario()) {
      this.router.navigate(['/login']);
      return;
    }

    forkJoin({
      consultas: this.clientConsulta.getConsultas(),
      profesionales: this.clientProfesional.getProfesionales(),
    }).subscribe({
      next: ({ consultas, profesionales }) => {
        this.consultas.set(consultas);
        this.profesionales.set(profesionales);
        this.pestana.set(this.esProfesional() && this.recibidas().length ? 'recibidas' : 'enviadas');
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer las consultas:', err);
        this.error.set('No se pudieron cargar las consultas.');
        this.cargando.set(false);
      },
    });
  }

  irA(pestana: Pestana): void {
    this.pestana.set(pestana);
  }

  volver(): void {
    this.location.back();
  }

  nombreProfesional(matricula: string): string {
    const u = this.profesionales().find((p) => String(p.professionalId) === String(matricula))?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : 'el profesional';
  }

  escribir(id: string, texto: string): void {
    this.borradores.update((b) => ({ ...b, [id]: texto }));
  }

  responder(c: Consulta): void {
    const texto = (this.borradores()[c.id!] ?? '').trim();
    if (!texto || this.enviando()) {
      return;
    }

    this.enviando.set(c.id!);
    this.clientConsulta.responder(c.id!, texto).subscribe({
      next: (actualizada) => {
        this.consultas.update((lista) => lista.map((x) => (x.id === c.id ? { ...x, ...actualizada } : x)));
        this.borradores.update((b) => ({ ...b, [c.id!]: '' }));
        this.enviando.set(null);
      },
      error: () => {
        this.enviando.set(null);
        alert('No se pudo enviar la respuesta. Intentá de nuevo.');
      },
    });
  }

  fecha(iso: string | undefined): string {
    return iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  }

  dia(c: Consulta): string {
    return String(new Date(c.creada ?? Date.now()).getDate());
  }

  mes(c: Consulta): string {
    return new Date(c.creada ?? Date.now()).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  }

  private ordenar(lista: Consulta[]): Consulta[] {
    return [...lista].sort((a, b) => (b.creada ?? '').localeCompare(a.creada ?? ''));
  }
}
