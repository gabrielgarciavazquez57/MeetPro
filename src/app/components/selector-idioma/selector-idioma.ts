import { Component, inject } from '@angular/core';
import { IdiomaService } from '../../services/idioma';

@Component({
  selector: 'app-selector-idioma',
  standalone: true,
  templateUrl: './selector-idioma.html',
  styleUrl: './selector-idioma.css',
})
export class SelectorIdioma {
  protected readonly idioma = inject(IdiomaService);
}
