import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CODIGOS_PAIS } from '../../shared/codigos-pais';

const sinAcentos = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Selector del código de país para un teléfono: bandera + prefijo, con los 252 países */
@Component({
  selector: 'app-codigo-telefono',
  standalone: true,
  templateUrl: './codigo-telefono.html',
  styleUrl: './codigo-telefono.css',
})
export class CodigoTelefono {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  readonly valor = input<string>('');
  readonly ariaLabel = input<string>('Código de país');

  readonly cambio = output<string>();

  protected readonly paises = CODIGOS_PAIS;
  protected readonly abierto = signal(false);
  protected readonly resaltado = signal(-1);
  private readonly lista = viewChild<ElementRef<HTMLUListElement>>('lista');

  /**
   * País elegido a mano (por ISO). Varios países comparten prefijo (ej. +1 en EE. UU. y Canadá),
   * así que buscar solo por "valor" no alcanza para saber cuál mostrar: se guarda cuál se tocó.
   */
  private readonly paisElegido = signal<string | null>(null);

  protected readonly actual = computed(() => {
    const iso = this.paisElegido();
    const porIso = iso ? this.paises.find((p) => p.iso === iso) : undefined;
    if (porIso && porIso.codigo === this.valor()) {
      return porIso;
    }
    return this.paises.find((p) => p.codigo === this.valor()) ?? this.paises[0];
  });

  @HostListener('document:click', ['$event'])
  protected clicAfuera(evento: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(evento.target as Node)) {
      this.abierto.set(false);
    }
  }

  protected alternar(): void {
    if (this.abierto()) {
      this.abierto.set(false);
    } else {
      this.abrir();
    }
  }

  private abrir(): void {
    if (this.abierto()) {
      return;
    }
    this.resaltado.set(Math.max(0, this.paises.findIndex((p) => p.iso === this.actual().iso)));
    this.abierto.set(true);
    this.asegurarVisible();
  }

  protected elegir(indice: number): void {
    const pais = this.paises[indice];
    if (pais) {
      this.paisElegido.set(pais.iso);
      this.cambio.emit(pais.codigo);
    }
    this.abierto.set(false);
  }

  protected teclado(evento: KeyboardEvent): void {
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.abrir();
        this.mover(1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.abrir();
        this.mover(-1);
        break;
      case 'Enter':
        if (this.abierto()) {
          evento.preventDefault();
          this.elegir(this.resaltado());
        }
        break;
      case 'Escape':
      case 'Tab':
        this.abierto.set(false);
        break;
      default:
        if (evento.key.length === 1 && evento.key !== ' ' && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
          this.saltarA(evento.key);
        }
    }
  }

  private mover(delta: number): void {
    const ultimo = this.paises.length - 1;
    this.resaltado.set(Math.min(ultimo, Math.max(0, this.resaltado() + delta)));
    this.asegurarVisible();
  }

  /** Escribir una letra salta al siguiente país cuyo nombre empiece con ella */
  private saltarA(letra: string): void {
    const buscada = sinAcentos(letra);
    const desde = this.abierto() ? this.resaltado() : -1;

    for (let paso = 1; paso <= this.paises.length; paso++) {
      const i = (desde + paso) % this.paises.length;
      if (sinAcentos(this.paises[i].nombre).startsWith(buscada)) {
        this.abrir();
        this.resaltado.set(i);
        this.asegurarVisible();
        return;
      }
    }
  }

  private asegurarVisible(): void {
    afterNextRender(
      () => {
        const lista = this.lista()?.nativeElement;
        const opcion = lista?.children[this.resaltado()] as HTMLElement | undefined;
        if (!lista || !opcion) {
          return;
        }
        if (opcion.offsetTop < lista.scrollTop) {
          lista.scrollTop = opcion.offsetTop;
        } else if (opcion.offsetTop + opcion.offsetHeight > lista.scrollTop + lista.clientHeight) {
          lista.scrollTop = opcion.offsetTop + opcion.offsetHeight - lista.clientHeight;
        }
      },
      { injector: this.injector },
    );
  }
}
