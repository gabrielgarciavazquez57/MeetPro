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

const sinAcentos = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Lista desplegable que siempre se abre hacia abajo (el <select> nativo decide solo hacia dónde abrir) */
@Component({
  selector: 'app-desplegable',
  standalone: true,
  templateUrl: './desplegable.html',
  styleUrl: './desplegable.css',
})
export class Desplegable {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  readonly opciones = input.required<readonly string[]>();
  readonly valor = input<string>('');
  /** Texto de la opción que deja el filtro sin valor */
  readonly textoVacio = input<string>('Todos');
  readonly ariaLabel = input<string>('');

  readonly cambio = output<string>();

  protected readonly abierto = signal(false);
  protected readonly resaltado = signal(-1);
  private readonly lista = viewChild<ElementRef<HTMLUListElement>>('lista');

  protected readonly todas = computed(() => [
    { valor: '', texto: this.textoVacio() },
    ...this.opciones().map((o) => ({ valor: o, texto: o })),
  ]);

  protected readonly etiquetaActual = computed(
    () => this.todas().find((o) => o.valor === this.valor())?.texto ?? this.textoVacio(),
  );

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
    this.resaltado.set(Math.max(0, this.todas().findIndex((o) => o.valor === this.valor())));
    this.abierto.set(true);
    this.asegurarVisible();
  }

  protected elegir(indice: number): void {
    const opcion = this.todas()[indice];
    if (opcion) {
      this.cambio.emit(opcion.valor);
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
    const ultimo = this.todas().length - 1;
    this.resaltado.set(Math.min(ultimo, Math.max(0, this.resaltado() + delta)));
    this.asegurarVisible();
  }

  /** Escribir una letra salta a la siguiente opción que empiece con ella */
  private saltarA(letra: string): void {
    const buscada = sinAcentos(letra);
    const opciones = this.todas();
    const desde = this.abierto() ? this.resaltado() : -1;

    for (let paso = 1; paso <= opciones.length; paso++) {
      const i = (desde + paso) % opciones.length;
      if (sinAcentos(opciones[i].texto).startsWith(buscada)) {
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
