import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type TipoToast = 'exito' | 'error' | 'aviso';

export interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

const MAXIMO_VISIBLES = 4;

/** Deduce el tipo del aviso a partir del texto, para no tener que indicarlo en cada llamada */
function inferirTipo(mensaje: string): TipoToast {
  if (/no se pud|error|fall[oó]|inv[aá]lid|no se encontr|incorrect/i.test(mensaje)) {
    return 'error';
  }
  if (/[eé]xito|actualizad|enviad|eliminad|guardad|cargad|registrad|confirmad|creado|se quit/i.test(mensaje)) {
    return 'exito';
  }
  return 'aviso';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private siguienteId = 0;

  readonly items = signal<ToastItem[]>([]);

  mostrar(mensaje: string, tipo?: TipoToast): void {
    const id = ++this.siguienteId;
    const tipoFinal = tipo ?? inferirTipo(mensaje);

    this.items.update((lista) => [...lista.slice(-(MAXIMO_VISIBLES - 1)), { id, tipo: tipoFinal, mensaje }]);

    if (this.esNavegador) {
      setTimeout(() => this.cerrar(id), tipoFinal === 'error' ? 7000 : 5000);
    }
  }

  cerrar(id: number): void {
    this.items.update((lista) => lista.filter((t) => t.id !== id));
  }
}
