import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [BarraNav, RouterLink, ReactiveFormsModule],
  templateUrl: './pago.html',
  styleUrls: ['../../shared/turnos.css', './pago.css'],
})
export class PagoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly fb = inject(FormBuilder);

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly procesando = signal<boolean>(false);
  readonly pagoRealizado = signal<boolean>(false);

  /** true si el profesional cargó un precio para su servicio */
  readonly tienePrecio = computed(() => typeof this.profesional()?.pago?.precio === 'number');

  readonly nombreProfesional = computed(() => {
    const u = this.profesional()?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : '';
  });

  protected readonly form = this.fb.nonNullable.group({
    titular:  ['', [Validators.required, Validators.minLength(3)]],
    numero:   ['', [Validators.required, Validators.pattern(/^(\d{4} ){3}\d{4}$/)]],
    venc:     ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv:      ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  get titular() { return this.form.controls.titular; }
  get numero()  { return this.form.controls.numero; }
  get venc()    { return this.form.controls.venc; }
  get cvv()     { return this.form.controls.cvv; }

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    this.cargar();
  }

  private cargar(): void {
    const id = this.profesionalId();
    this.cargando.set(true);
    this.error.set(null);

    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => {
        const prof = lista.find((p) => String(p.professionalId) === String(id)) ?? null;
        if (!prof) {
          this.error.set('No se encontró el profesional.');
        }
        this.profesional.set(prof);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer el profesional:', err);
        this.error.set('No se pudo cargar el profesional.');
        this.cargando.set(false);
      },
    });
  }

  /** Agrupa el número de tarjeta en bloques de 4 mientras se escribe */
  onNumeroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/\D/g, '').slice(0, 16);
    const agrupado = (soloDigitos.match(/.{1,4}/g) ?? []).join(' ');
    this.numero.setValue(agrupado);
  }

  onVencInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/\D/g, '').slice(0, 4);
    const formateado = soloDigitos.length > 2 ? `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2)}` : soloDigitos;
    this.venc.setValue(formateado);
  }

  handleSubmit(): void {
    if (this.form.invalid || !this.tienePrecio()) {
      this.form.markAllAsTouched();
      return;
    }

    // No hay pasarela de pago real conectada: se simula el procesamiento.
    this.procesando.set(true);
    setTimeout(() => {
      this.procesando.set(false);
      this.pagoRealizado.set(true);
    }, 1200);
  }
}
