import { Component, computed, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientProfesional } from '../../services/client-profesional';
import { ClientInformacionProfesional } from '../../services/client-informacion-profesional';
import { ClientProyecto } from '../../services/client-proyecto';
import { Auth } from '../../services/auth';
import { Profesional } from '../../interfaces/profesional';
import { InformacionProfesional } from '../../interfaces/informacion-profesional';
import { Proyecto } from '../../interfaces/proyecto';
import { Certificado } from '../../interfaces/certificado';
import { TitulosPro } from '../../interfaces/titulos-pro';
import { ExperienciaPro } from '../../interfaces/experiencia-pro';
import { BarraNav } from '../barra-nav/barra-nav';

@Component({
  selector: 'app-informacion-profesional',
  standalone: true,
  imports: [BarraNav, ReactiveFormsModule, RouterLink],
  templateUrl: './informacion-profesional.html',
  styleUrl: './informacion-profesional.css',
})
export class InformacionProfesionalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly clientProfesional = inject(ClientProfesional);
  private readonly clientInformacion = inject(ClientInformacionProfesional);
  private readonly clientProyecto = inject(ClientProyecto);
  private readonly auth = inject(Auth);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly profesionalId = signal<string>('');
  readonly profesional = signal<Profesional | null>(null);
  readonly informacion = signal<InformacionProfesional | null>(null);
  readonly proyectos = signal<Proyecto[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  /** Muestra u oculta el formulario de edición de la descripción ampliada */
  readonly editando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    descripcionAmpliada: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  get descripcionAmpliada() { return this.form.controls.descripcionAmpliada; }

  /** Muestra u oculta el formulario para agregar un proyecto */
  readonly mostrandoFormProyecto = signal<boolean>(false);
  readonly guardandoProyecto = signal<boolean>(false);
  readonly imagenProyectoPreview = signal<string>('');

  protected readonly formProyecto = this.fb.nonNullable.group({
    titulo_proyecto:       ['', [Validators.required]],
    fecha_inicio:          [''],
    fecha_finalizacion:    [''],
    descripcion_proyecto:  ['', [Validators.required, Validators.maxLength(800)]],
    imagen_proyecto:       [''],
    link_adjunto:          [''],
  });

  get titulo_proyecto()      { return this.formProyecto.controls.titulo_proyecto; }
  get descripcion_proyecto() { return this.formProyecto.controls.descripcion_proyecto; }
  get imagen_proyecto()      { return this.formProyecto.controls.imagen_proyecto; }
  get link_adjunto()         { return this.formProyecto.controls.link_adjunto; }

  /** Lleva el scroll hasta la sección indicada */
  irASeccion(id: string): void {
    if (!this.esNavegador) {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Solo el profesional dueño de este perfil puede cargar/editar la descripción ampliada */
  readonly esDueno = computed(() => {
    const logueado = this.auth.usuario();
    const u = this.profesional()?.profesional_userData;
    return !!logueado && !!u && String(logueado.id) === String(u.id);
  });

  ngOnInit(): void {
    this.profesionalId.set(this.route.snapshot.paramMap.get('profesionalId') ?? '');
    this.cargarProfesional();
    this.cargarInformacion();
    this.cargarProyectos();
  }

  private cargarProfesional(): void {
    const id = this.profesionalId();
    this.clientProfesional.getProfesionales().subscribe({
      next: (lista) => this.profesional.set(lista.find((p) => p.professionalId === id) ?? null),
      error: (err) => console.error('Error al traer el profesional:', err),
    });
  }

  cargarInformacion(): void {
    this.cargando.set(true);
    this.error.set(null);

    const id = this.profesionalId();
    this.clientInformacion.getInformaciones().subscribe({
      next: (data) => {
        this.informacion.set(data.find((i) => String(i.professionalId) === id) ?? null);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al traer la información profesional:', err);
        this.error.set('No se pudo cargar la información profesional.');
        this.cargando.set(false);
      },
    });
  }

  abrirEdicion(): void {
    if (!this.esDueno()) {
      return;
    }
    this.form.setValue({ descripcionAmpliada: this.informacion()?.descripcionAmpliada ?? '' });
    this.editando.set(true);
  }

  cancelar(): void {
    this.editando.set(false);
  }

  guardar(): void {
    const prof = this.profesional();
    if (this.form.invalid || !prof) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const { descripcionAmpliada } = this.form.getRawValue();
    const actual = this.informacion();

    const datos: InformacionProfesional = {
      professionalId: this.profesionalId(),
      profesional_userData: prof.profesional_userData,
      descripcionAmpliada: descripcionAmpliada.trim(),
    };

    const alTerminar = (guardada: InformacionProfesional) => {
      this.informacion.set(guardada);
      this.guardando.set(false);
      this.editando.set(false);
    };

    if (actual?.id) {
      this.clientInformacion.updateInformacion(actual.id, { ...datos, id: actual.id }).subscribe({
        next: alTerminar,
        error: () => {
          this.guardando.set(false);
          alert('No se pudo guardar la descripción ampliada.');
        },
      });
    } else {
      this.clientInformacion.addInformacion(datos).subscribe({
        next: alTerminar,
        error: () => {
          this.guardando.set(false);
          alert('No se pudo guardar la descripción ampliada.');
        },
      });
    }
  }

  // ===== PROYECTOS =====
  /** Índice del proyecto que se muestra en el carrusel */
  readonly indiceProyecto = signal(0);
  /** Sentido del último cambio, para animar el deslizamiento */
  readonly direccionProyecto = signal<'izq' | 'der'>('der');

  readonly proyectoActual = computed(() => {
    const lista = this.proyectos();
    if (!lista.length) {
      return null;
    }
    const i = Math.min(this.indiceProyecto(), lista.length - 1);
    return lista[i];
  });

  /** El proyecto actual envuelto en una lista: al cambiar de id, Angular recrea
   *  el <article> (en vez de reutilizarlo), así la animación CSS se reproduce siempre. */
  readonly proyectoActualLista = computed(() => {
    const p = this.proyectoActual();
    return p ? [p] : [];
  });

  siguienteProyecto(): void {
    const total = this.proyectos().length;
    if (total < 2) {
      return;
    }
    this.direccionProyecto.set('der');
    this.indiceProyecto.update((i) => (i + 1) % total);
  }

  anteriorProyecto(): void {
    const total = this.proyectos().length;
    if (total < 2) {
      return;
    }
    this.direccionProyecto.set('izq');
    this.indiceProyecto.update((i) => (i - 1 + total) % total);
  }

  private cargarProyectos(): void {
    const id = this.profesionalId();
    this.clientProyecto.getProyectos().subscribe({
      next: (data) => {
        this.proyectos.set(data.filter((p) => String(p.professionalId) === id));
        this.indiceProyecto.set(0);
      },
      error: (err) => console.error('Error al traer los proyectos:', err),
    });
  }

  /** Proyecto que se está editando (null = alta de proyecto nuevo) */
  readonly proyectoEditar = signal<Proyecto | null>(null);

  abrirFormProyecto(): void {
    if (!this.esDueno()) {
      return;
    }
    this.proyectoEditar.set(null);
    this.formProyecto.reset({
      titulo_proyecto: '',
      fecha_inicio: '',
      fecha_finalizacion: '',
      descripcion_proyecto: '',
      imagen_proyecto: '',
      link_adjunto: '',
    });
    this.imagenProyectoPreview.set('');
    this.mostrandoFormProyecto.set(true);
  }

  editarProyecto(p: Proyecto): void {
    if (!this.esDueno()) {
      return;
    }
    this.proyectoEditar.set(p);
    this.formProyecto.reset({
      titulo_proyecto: p.titulo_proyecto,
      fecha_inicio: p.fecha_inicio,
      fecha_finalizacion: p.fecha_finalizacion ?? '',
      descripcion_proyecto: p.descripcion_proyecto,
      imagen_proyecto: p.imagen_proyecto ?? '',
      link_adjunto: p.link_adjunto ?? '',
    });
    this.imagenProyectoPreview.set(p.imagen_proyecto ?? '');
    this.mostrandoFormProyecto.set(true);
  }

  cancelarProyecto(): void {
    this.mostrandoFormProyecto.set(false);
    this.proyectoEditar.set(null);
  }

  onImagenProyecto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const dataUrl = lector.result as string;
      this.imagenProyectoPreview.set(dataUrl);
      this.imagen_proyecto.setValue(dataUrl);
    };
    lector.readAsDataURL(file);
    input.value = '';
  }

  guardarProyecto(): void {
    if (this.formProyecto.invalid) {
      this.formProyecto.markAllAsTouched();
      return;
    }

    this.guardandoProyecto.set(true);
    const raw = this.formProyecto.getRawValue();
    const editando = this.proyectoEditar();

    const datos: Proyecto = {
      professionalId: this.profesionalId(),
      titulo_proyecto: raw.titulo_proyecto.trim(),
      fecha_inicio: raw.fecha_inicio,
      fecha_finalizacion: raw.fecha_finalizacion,
      descripcion_proyecto: raw.descripcion_proyecto.trim(),
      imagen_proyecto: raw.imagen_proyecto,
      link_adjunto: raw.link_adjunto.trim(),
    };

    const alTerminar = (guardado: Proyecto) => {
      this.proyectos.update((lista) =>
        editando ? lista.map((p) => (p.id === editando.id ? guardado : p)) : [guardado, ...lista],
      );
      if (!editando) {
        this.indiceProyecto.set(0);
      }
      this.guardandoProyecto.set(false);
      this.mostrandoFormProyecto.set(false);
      this.proyectoEditar.set(null);
    };

    const peticion = editando?.id
      ? this.clientProyecto.updateProyecto(editando.id, { ...datos, id: editando.id })
      : this.clientProyecto.addProyecto(datos);

    peticion.subscribe({
      next: alTerminar,
      error: () => {
        this.guardandoProyecto.set(false);
        alert('No se pudo guardar el proyecto.');
      },
    });
  }

  eliminarProyecto(id: string | number | undefined): void {
    if (id == null || !this.esDueno() || !confirm('¿Eliminar este proyecto?')) {
      return;
    }
    this.clientProyecto.deleteProyecto(id).subscribe({
      next: () => {
        this.proyectos.update((lista) => lista.filter((p) => p.id !== id));
        const total = this.proyectos().length;
        if (total > 0) {
          this.indiceProyecto.update((i) => Math.min(i, total - 1));
        } else {
          this.indiceProyecto.set(0);
        }
      },
      error: () => alert('No se pudo eliminar el proyecto.'),
    });
  }

  // ===== CERTIFICADOS =====
  /** Muestra u oculta el formulario para agregar/editar un certificado */
  readonly mostrandoFormCertificado = signal<boolean>(false);
  readonly guardandoCertificado = signal<boolean>(false);
  /** Certificado que se está editando (null = alta de certificado nuevo) */
  readonly certificadoEditar = signal<Certificado | null>(null);

  protected readonly formCertificado = this.fb.nonNullable.group({
    nombre_certificado:      ['', [Validators.required]],
    institucion_certificado: ['', [Validators.required]],
    fecha_obtencion:         ['', [Validators.required]],
    descripcion_certificado: ['', [Validators.maxLength(500)]],
  });

  get nombre_certificado()      { return this.formCertificado.controls.nombre_certificado; }
  get institucion_certificado() { return this.formCertificado.controls.institucion_certificado; }
  get fecha_obtencion_cert()    { return this.formCertificado.controls.fecha_obtencion; }
  get descripcion_certificado() { return this.formCertificado.controls.descripcion_certificado; }

  abrirFormCertificado(): void {
    if (!this.esDueno()) {
      return;
    }
    this.certificadoEditar.set(null);
    this.formCertificado.reset({
      nombre_certificado: '',
      institucion_certificado: '',
      fecha_obtencion: '',
      descripcion_certificado: '',
    });
    this.mostrandoFormCertificado.set(true);
  }

  editarCertificado(c: Certificado): void {
    if (!this.esDueno()) {
      return;
    }
    this.certificadoEditar.set(c);
    this.formCertificado.reset({
      nombre_certificado: c.nombre_certificado,
      institucion_certificado: c.institucion_certificado,
      fecha_obtencion: c.fecha_obtencion,
      descripcion_certificado: c.descripcion_certificado ?? '',
    });
    this.mostrandoFormCertificado.set(true);
  }

  cancelarCertificado(): void {
    this.mostrandoFormCertificado.set(false);
    this.certificadoEditar.set(null);
  }

  guardarCertificado(): void {
    const prof = this.profesional();
    if (this.formCertificado.invalid || !prof?.id) {
      this.formCertificado.markAllAsTouched();
      return;
    }

    this.guardandoCertificado.set(true);
    const raw = this.formCertificado.getRawValue();
    const editando = this.certificadoEditar();

    const datos: Certificado = {
      id: editando?.id ?? `c-${Date.now()}`,
      nombre_certificado: raw.nombre_certificado.trim(),
      institucion_certificado: raw.institucion_certificado.trim(),
      fecha_obtencion: raw.fecha_obtencion,
      descripcion_certificado: raw.descripcion_certificado.trim(),
    };

    const certificados = editando
      ? (prof.certificados ?? []).map((c) => (c.id === editando.id ? datos : c))
      : [...(prof.certificados ?? []), datos];

    this.clientProfesional.updateProfesional(prof.id, { ...prof, certificados }).subscribe({
      next: (actualizado) => {
        this.profesional.set(actualizado);
        this.guardandoCertificado.set(false);
        this.mostrandoFormCertificado.set(false);
        this.certificadoEditar.set(null);
      },
      error: () => {
        this.guardandoCertificado.set(false);
        alert('No se pudo guardar el certificado.');
      },
    });
  }

  eliminarCertificado(id: string | number | undefined): void {
    const prof = this.profesional();
    if (id == null || !prof?.id || !this.esDueno() || !confirm('¿Eliminar este certificado?')) {
      return;
    }

    const certificados = (prof.certificados ?? []).filter((c) => c.id !== id);

    this.clientProfesional.updateProfesional(prof.id, { ...prof, certificados }).subscribe({
      next: (actualizado) => this.profesional.set(actualizado),
      error: () => alert('No se pudo eliminar el certificado.'),
    });
  }

  // ===== TÍTULOS =====
  /** Muestra u oculta el formulario para agregar/editar un título */
  readonly mostrandoFormTitulo = signal<boolean>(false);
  readonly guardandoTitulo = signal<boolean>(false);
  /** Título que se está editando (null = alta de título nuevo) */
  readonly tituloEditar = signal<TitulosPro | null>(null);

  protected readonly formTitulo = this.fb.nonNullable.group({
    nombre_titulo:          ['', [Validators.required]],
    institucion_educativa:  ['', [Validators.required]],
    fecha_obtencion:        ['', [Validators.required]],
    descripcion_titulo:     ['', [Validators.maxLength(500)]],
  });

  get nombre_titulo()          { return this.formTitulo.controls.nombre_titulo; }
  get institucion_educativa()  { return this.formTitulo.controls.institucion_educativa; }
  get fecha_obtencion_tit()    { return this.formTitulo.controls.fecha_obtencion; }
  get descripcion_titulo()     { return this.formTitulo.controls.descripcion_titulo; }

  abrirFormTitulo(): void {
    if (!this.esDueno()) {
      return;
    }
    this.tituloEditar.set(null);
    this.formTitulo.reset({
      nombre_titulo: '',
      institucion_educativa: '',
      fecha_obtencion: '',
      descripcion_titulo: '',
    });
    this.mostrandoFormTitulo.set(true);
  }

  editarTitulo(t: TitulosPro): void {
    if (!this.esDueno()) {
      return;
    }
    this.tituloEditar.set(t);
    this.formTitulo.reset({
      nombre_titulo: t.nombre_titulo,
      institucion_educativa: t.institucion_educativa,
      fecha_obtencion: t.fecha_obtencion,
      descripcion_titulo: t.descripcion_titulo ?? '',
    });
    this.mostrandoFormTitulo.set(true);
  }

  cancelarTitulo(): void {
    this.mostrandoFormTitulo.set(false);
    this.tituloEditar.set(null);
  }

  guardarTitulo(): void {
    const prof = this.profesional();
    if (this.formTitulo.invalid || !prof?.id) {
      this.formTitulo.markAllAsTouched();
      return;
    }

    this.guardandoTitulo.set(true);
    const raw = this.formTitulo.getRawValue();
    const editando = this.tituloEditar();

    const datos: TitulosPro = {
      id: editando?.id ?? `t-${Date.now()}`,
      nombre_titulo: raw.nombre_titulo.trim(),
      institucion_educativa: raw.institucion_educativa.trim(),
      fecha_obtencion: raw.fecha_obtencion,
      descripcion_titulo: raw.descripcion_titulo.trim(),
    };

    const titulos = editando
      ? (prof.titulos ?? []).map((t) => (t.id === editando.id ? datos : t))
      : [...(prof.titulos ?? []), datos];

    this.clientProfesional.updateProfesional(prof.id, { ...prof, titulos }).subscribe({
      next: (actualizado) => {
        this.profesional.set(actualizado);
        this.guardandoTitulo.set(false);
        this.mostrandoFormTitulo.set(false);
        this.tituloEditar.set(null);
      },
      error: () => {
        this.guardandoTitulo.set(false);
        alert('No se pudo guardar el título.');
      },
    });
  }

  eliminarTitulo(id: string | number | undefined): void {
    const prof = this.profesional();
    if (id == null || !prof?.id || !this.esDueno() || !confirm('¿Eliminar este título?')) {
      return;
    }

    const titulos = (prof.titulos ?? []).filter((t) => t.id !== id);

    this.clientProfesional.updateProfesional(prof.id, { ...prof, titulos }).subscribe({
      next: (actualizado) => this.profesional.set(actualizado),
      error: () => alert('No se pudo eliminar el título.'),
    });
  }

  // ===== EXPERIENCIA PROFESIONAL =====
  /** Muestra u oculta el formulario para agregar/editar una experiencia */
  readonly mostrandoFormExperiencia = signal<boolean>(false);
  readonly guardandoExperiencia = signal<boolean>(false);
  /** Experiencia que se está editando (null = alta de experiencia nueva) */
  readonly experienciaEditar = signal<ExperienciaPro | null>(null);

  protected readonly formExperiencia = this.fb.nonNullable.group({
    titulo_experiencia:      ['', [Validators.required]],
    institucion_experiencia: ['', [Validators.required]],
    fecha_inicio:            ['', [Validators.required]],
    fecha_fin:               [''],
  });

  get titulo_experiencia()      { return this.formExperiencia.controls.titulo_experiencia; }
  get institucion_experiencia() { return this.formExperiencia.controls.institucion_experiencia; }
  get fecha_inicio_exp()        { return this.formExperiencia.controls.fecha_inicio; }

  abrirFormExperiencia(): void {
    if (!this.esDueno()) {
      return;
    }
    this.experienciaEditar.set(null);
    this.formExperiencia.reset({
      titulo_experiencia: '',
      institucion_experiencia: '',
      fecha_inicio: '',
      fecha_fin: '',
    });
    this.mostrandoFormExperiencia.set(true);
  }

  editarExperiencia(e: ExperienciaPro): void {
    if (!this.esDueno()) {
      return;
    }
    this.experienciaEditar.set(e);
    this.formExperiencia.reset({
      titulo_experiencia: e.titulo_experiencia,
      institucion_experiencia: e.institucion_experiencia,
      fecha_inicio: e.fecha_inicio,
      fecha_fin: e.fecha_fin ?? '',
    });
    this.mostrandoFormExperiencia.set(true);
  }

  cancelarExperiencia(): void {
    this.mostrandoFormExperiencia.set(false);
    this.experienciaEditar.set(null);
  }

  guardarExperiencia(): void {
    const prof = this.profesional();
    if (this.formExperiencia.invalid || !prof?.id) {
      this.formExperiencia.markAllAsTouched();
      return;
    }

    this.guardandoExperiencia.set(true);
    const raw = this.formExperiencia.getRawValue();
    const editando = this.experienciaEditar();

    const datos: ExperienciaPro = {
      id: editando?.id ?? `e-${Date.now()}`,
      titulo_experiencia: raw.titulo_experiencia.trim(),
      institucion_experiencia: raw.institucion_experiencia.trim(),
      fecha_inicio: raw.fecha_inicio,
      fecha_fin: raw.fecha_fin,
    };

    const experiencias = editando
      ? (prof.experiencias ?? []).map((e) => (e.id === editando.id ? datos : e))
      : [...(prof.experiencias ?? []), datos];

    this.clientProfesional.updateProfesional(prof.id, { ...prof, experiencias }).subscribe({
      next: (actualizado) => {
        this.profesional.set(actualizado);
        this.guardandoExperiencia.set(false);
        this.mostrandoFormExperiencia.set(false);
        this.experienciaEditar.set(null);
      },
      error: () => {
        this.guardandoExperiencia.set(false);
        alert('No se pudo guardar la experiencia.');
      },
    });
  }

  eliminarExperiencia(id: string | number | undefined): void {
    const prof = this.profesional();
    if (id == null || !prof?.id || !this.esDueno() || !confirm('¿Eliminar esta experiencia?')) {
      return;
    }

    const experiencias = (prof.experiencias ?? []).filter((e) => e.id !== id);

    this.clientProfesional.updateProfesional(prof.id, { ...prof, experiencias }).subscribe({
      next: (actualizado) => this.profesional.set(actualizado),
      error: () => alert('No se pudo eliminar la experiencia.'),
    });
  }
}
