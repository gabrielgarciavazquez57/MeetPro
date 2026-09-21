import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClientUser } from '../../services/client-user';
import { ClientCuenta } from '../../services/client-cuenta';
import { Auth } from '../../services/auth';
import { User } from '../../interfaces/user';
import { BarraNav } from '../barra-nav/barra-nav';

type Filtro = 'todos' | 'profesionales' | 'clientes' | 'admins';

const normalizar = (texto: string | undefined) =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

@Component({
  selector: 'app-lista-usuarios',
  standalone: true,
  imports: [BarraNav, RouterLink, FormsModule],
  templateUrl: './lista-usuarios.html',
  styleUrls: ['../../shared/turnos.css', './lista-usuarios.css'],
})
export class ListaUsuarios implements OnInit {
  private readonly clientUser = inject(ClientUser);
  private readonly clientCuenta = inject(ClientCuenta);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly usuarios = signal<User[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly filtro = signal<Filtro>('todos');
  readonly busqueda = signal<string>('');

  /** Solo los administradores pueden ver el listado de usuarios */
  readonly esAdmin = computed(() => this.auth.usuario()?.isAdmin === true);

  private esCliente(u: User): boolean {
    return !u.isProfesional && !u.isAdmin;
  }

  readonly conteos = computed(() => {
    const lista = this.usuarios();
    return {
      todos: lista.length,
      profesionales: lista.filter((u) => u.isProfesional).length,
      clientes: lista.filter((u) => this.esCliente(u)).length,
      admins: lista.filter((u) => u.isAdmin).length,
    };
  });

  readonly visibles = computed(() => {
    const filtro = this.filtro();
    const texto = normalizar(this.busqueda());

    return this.usuarios()
      .filter((u) => {
        if (filtro === 'profesionales' && !u.isProfesional) return false;
        if (filtro === 'clientes' && !this.esCliente(u)) return false;
        if (filtro === 'admins' && !u.isAdmin) return false;
        if (!texto) return true;
        const pajar = normalizar(`${u.name} ${u.lastname} ${u.username} ${u.email} ${u.dni} ${u.phoneNumber}`);
        return pajar.includes(texto);
      })
      .sort((a, b) => `${a.lastname} ${a.name}`.localeCompare(`${b.lastname} ${b.name}`, 'es'));
  });

  ngOnInit(): void {
    if (!this.esNavegador) {
      return;
    }

    if (!this.esAdmin()) {
      this.router.navigate(['/']);
      return;
    }

    this.clientUser.getUsers().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer los usuarios:', err);
        this.error.set('No se pudieron cargar los usuarios.');
        this.cargando.set(false);
      },
    });
  }

  // ===== Eliminar usuario =====
  /** id del usuario que está pidiendo confirmación para eliminarse */
  readonly confirmando = signal<string | number | null>(null);
  readonly eliminando = signal<boolean>(false);

  /** Un administrador no puede eliminar su propia cuenta desde acá */
  esPropio(u: User): boolean {
    return String(u.id) === String(this.auth.usuario()?.id);
  }

  pedirConfirmacion(u: User): void {
    this.confirmando.set(u.id ?? null);
  }

  cancelarConfirmacion(): void {
    this.confirmando.set(null);
  }

  eliminar(u: User): void {
    if (u.id == null || this.esPropio(u) || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);

    // Borra la cuenta y todos los datos relacionados (perfil profesional, turnos, valoraciones, etc.)
    this.clientCuenta.eliminarCuenta(u).subscribe({
      next: () => {
        this.usuarios.update((lista) => lista.filter((x) => String(x.id) !== String(u.id)));
        this.confirmando.set(null);
        this.eliminando.set(false);
      },
      error: () => {
        this.eliminando.set(false);
        alert('No se pudo eliminar el usuario. Intentá de nuevo.');
      },
    });
  }

  irA(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  iniciales(u: User): string {
    return `${u.name?.charAt(0) ?? ''}${u.lastname?.charAt(0) ?? ''}`.toUpperCase();
  }
}
