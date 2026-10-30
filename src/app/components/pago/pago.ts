import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, switchMap, timer } from 'rxjs';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientTicket } from '../../services/client-ticket';
import { NotificacionesService } from '../../services/notificaciones';
import { Auth } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Ticket } from '../../interfaces/ticket';
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
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly clientTicket = inject(ClientTicket);
  private readonly toast = inject(ToastService);
  private readonly notificaciones = inject(NotificacionesService);

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly procesando = signal<boolean>(false);
  readonly pagoRealizado = signal<boolean>(false);
  /** true cuando la tarjeta de prueba "rechazada" fue usada: simula un pago que no se aprobó */
  readonly rechazado = signal<boolean>(false);
  readonly comprobante = signal<string>('');
  /** Pago aprobado de este mes al mismo profesional: si existe, no se puede pagar de nuevo hasta el mes siguiente */
  readonly pagoPrevio = signal<Ticket | null>(null);

  /** Primer día del mes que viene, desde cuando se vuelve a poder pagar */
  protected readonly proximoPago = (() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  })();

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
        if (prof) {
          this.buscarPagoDelMes(prof);
        }
      },
      error: (err) => {
        console.error('Error al traer el profesional:', err);
        this.error.set('No se pudo cargar el profesional.');
        this.cargando.set(false);
      },
    });
  }

  /** Busca si el usuario ya pagó este mes a este profesional (la base también lo impide) */
  private buscarPagoDelMes(prof: Profesional): void {
    const usuario = this.auth.usuario();
    if (!usuario?.id) {
      return;
    }
    const hoy = new Date();
    const esteMes = (iso: string) => {
      const d = new Date(iso);
      return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
    };
    this.clientTicket.getTickets().subscribe({
      next: (tickets) =>
        this.pagoPrevio.set(
          tickets.find(
            (t) =>
              t.estado === 'aprobado' &&
              String(t.usuario.id) === String(usuario.id) &&
              String(t.profesional.id) === String(prof.profesional_userData.id) &&
              esteMes(t.fecha),
          ) ?? null,
        ),
      error: (err) => console.error('Error al revisar los pagos del mes:', err),
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

    const usuario = this.auth.usuario();
    const prof = this.profesional();
    if (!usuario?.id || !prof) {
      this.toast.mostrar('Iniciá sesión para realizar el pago.', 'aviso');
      this.router.navigate(['/login']);
      return;
    }

    // No hay pasarela de pago conectada: el resultado depende solo de la tarjeta de prueba.
    // Lo único que se guarda es el ticket (comprobante), nunca los datos de la tarjeta.
    const rechazada = this.numero.value === TARJETA_RECHAZADA;
    const ticket: Ticket = {
      numeroComprobante: 'PRUEBA-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      monto: prof.pago?.precio ?? 0,
      fecha: new Date().toISOString(),
      profesional: {
        id: prof.profesional_userData.id ?? '',
        professionalId: prof.professionalId,
        name: prof.profesional_userData.name,
        lastname: prof.profesional_userData.lastname,
        profession: prof.profession,
      },
      usuario: { id: usuario.id, name: usuario.name, lastname: usuario.lastname, email: usuario.email },
      estado: rechazada ? 'rechazado' : 'aprobado',
      concepto: 'Pago mensual',
      moneda: 'ARS',
      ultimosDigitos: this.numero.value.slice(-4),
      esPrueba: true,
    };

    this.rechazado.set(false);
    this.procesando.set(true);
    const guardado$: Observable<Ticket> = timer(1200).pipe(switchMap(() => this.clientTicket.addTicket(ticket)));
    guardado$.subscribe({
      next: (guardado) => {
        this.procesando.set(false);
        // El disparador de la base ya generó el aviso del pago: se trae enseguida
        this.notificaciones.actualizar();
        if (rechazada) {
          this.rechazado.set(true);
          return;
        }
        this.comprobante.set(guardado.numeroComprobante);
        this.pagoRealizado.set(true);
      },
      error: (err: unknown) => {
        this.procesando.set(false);
        if (String((err as Error)?.message ?? err).includes('PAGO_MENSUAL_DUPLICADO')) {
          this.toast.mostrar('Ya realizaste el pago de este mes a este profesional.', 'aviso');
          this.buscarPagoDelMes(prof);
          return;
        }
        this.toast.mostrar('No se pudo registrar el pago. Intentá de nuevo.', 'error');
      },
    });
  }
}
