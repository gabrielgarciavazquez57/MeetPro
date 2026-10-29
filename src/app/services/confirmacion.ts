import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  mensaje: string;
  titulo?: string;
  /** Texto del botón que confirma (por defecto "Aceptar") */
  aceptar?: string;
  /** Texto del botón que cancela (por defecto "Cancelar") */
  cancelar?: string;
  /** Para acciones destructivas: el botón de confirmar se muestra en rojo */
  peligro?: boolean;
}

export interface ConfirmacionPendiente extends OpcionesConfirmacion {
  resolver: (confirmado: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmacionService {
  readonly actual = signal<ConfirmacionPendiente | null>(null);

  /** Muestra el diálogo y devuelve true si la persona confirma, false si cancela */
  pedir(opciones: string | OpcionesConfirmacion): Promise<boolean> {
    const o = typeof opciones === 'string' ? { mensaje: opciones } : opciones;

    // Si ya había una abierta, se da por cancelada
    this.actual()?.resolver(false);

    return new Promise<boolean>((resolver) => this.actual.set({ ...o, resolver }));
  }

  responder(confirmado: boolean): void {
    const pendiente = this.actual();
    if (!pendiente) {
      return;
    }
    this.actual.set(null);
    pendiente.resolver(confirmado);
  }
}
