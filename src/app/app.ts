import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Toasts } from './components/toasts/toasts';
import { Confirmacion } from './components/confirmacion/confirmacion';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Toasts, Confirmacion],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MeetPro');
}