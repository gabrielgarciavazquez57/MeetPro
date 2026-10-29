import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmacionService } from '../../services/confirmacion';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
  host: { '(document:keydown.escape)': 'responder(false)' },
})
export class Confirmacion {
  private readonly servicio = inject(ConfirmacionService);

  readonly actual = this.servicio.actual;
  private readonly botonAceptar = viewChild<ElementRef<HTMLButtonElement>>('botonAceptar');

  constructor() {
    // Al abrirse el diálogo, el foco va al botón de confirmar
    effect(() => {
      const boton = this.botonAceptar();
      if (boton) {
        setTimeout(() => boton.nativeElement.focus());
      }
    });
  }

  responder(confirmado: boolean): void {
    this.servicio.responder(confirmado);
  }
}
