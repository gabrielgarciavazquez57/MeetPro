import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { Profesional } from '../../interfaces/profesional';
import { BarraNav } from '../barra-nav/barra-nav';

/** Único entorno de pago: simulado. Solo se aceptan estas tarjetas de prueba, ninguna real */
const TARJETA_APROBADA = '4242 4242 4242 4242';
const TARJETA_RECHAZADA = '4000 0000 0000 0002';

/** Si el número está completo y no es una tarjeta de prueba, el pago no se permite */
function tarjetaDePrueba(control: AbstractControl): ValidationErrors | null {
  const valor: string = control.value ?? '';
  if (!/^(\d{4} ){3}\d{4}$/.test(valor)) {
    return null;
  }
  return valor === TARJETA_APROBADA || valor === TARJETA_RECHAZADA ? null : { noEsDePrueba: true };
}

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
  /** true cuando la tarjeta de prueba "rechazada" fue usada: simula un pago que no se aprobó */
  readonly rechazado = signal<boolean>(false);
  readonly comprobante = signal<string>('');

  protected readonly tarjetasPrueba = [
    { tipo: 'aprobada', etiqueta: 'Pago aprobado', numero: TARJETA_APROBADA },
    { tipo: 'rechazada', etiqueta: 'Pago rechazado', numero: TARJETA_RECHAZADA },
  ] as const;

  /** true si el profesional cargó un precio para su servicio */
  readonly tienePrecio = computed(() => typeof this.profesional()?.pago?.precio === 'number');

  readonly nombreProfesional = computed(() => {
    const u = this.profesional()?.profesional_userData;
    return u ? `${u.name} ${u.lastname}` : '';
  });

  protected readonly form = this.fb.nonNullable.group({
    titular:  ['', [Validators.required, Validators.minLength(3)]],
    numero:   ['', [Validators.required, Validators.pattern(/^(\d{4} ){3}\d{4}$/), tarjetaDePrueba]],
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

  /** Completa el formulario con una tarjeta de prueba */
  usarTarjeta(tipo: 'aprobada' | 'rechazada'): void {
    this.rechazado.set(false);
    this.form.patchValue({
      titular: 'Titular de Prueba',
      numero: tipo === 'aprobada' ? TARJETA_APROBADA : TARJETA_RECHAZADA,
      venc: '12/30',
      cvv: '123',
    });
    this.form.markAsDirty();
  }

  handleSubmit(): void {
    if (this.form.invalid || !this.tienePrecio()) {
      this.form.markAllAsTouched();
      return;
    }

    // No hay pasarela de pago conectada ni se guarda nada: el resultado depende solo de la tarjeta de prueba.
    this.rechazado.set(false);
    this.procesando.set(true);
    setTimeout(() => {
      this.procesando.set(false);
      if (this.numero.value === TARJETA_RECHAZADA) {
        this.rechazado.set(true);
        return;
      }
      this.comprobante.set('PRUEBA-' + Math.random().toString(36).slice(2, 8).toUpperCase());
      this.pagoRealizado.set(true);
    }, 1200);
  }
}
