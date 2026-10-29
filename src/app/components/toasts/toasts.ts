import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-toasts',
  standalone: true,
  templateUrl: './toasts.html',
  styleUrl: './toasts.css',
})
export class Toasts {
  private readonly servicio = inject(ToastService);

  readonly items = this.servicio.items;

  cerrar(id: number): void {
    this.servicio.cerrar(id);
  }
}
