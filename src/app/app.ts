import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Toasts } from './components/toasts/toasts';
import { Confirmacion } from './components/confirmacion/confirmacion';
import { IdiomaService } from './services/idioma';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Toasts, Confirmacion],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MeetPro');
  // Se crea acá para que el idioma guardado se aplique apenas carga la página
  private readonly idioma = inject(IdiomaService);
}