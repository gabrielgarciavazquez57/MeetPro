import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { ClientUser } from '../../services/client-user';
import { ClientProfesional } from '../../services/client-profesional'; // 👈 nuevo
import { ClientInformacionProfesional } from '../../services/client-informacion-profesional';
import { ClientProyecto } from '../../services/client-proyecto';
import { User } from '../../interfaces/user';
import { Profesional } from '../../interfaces/profesional';
import { InformacionProfesional } from '../../interfaces/informacion-profesional';
import { Proyecto } from '../../interfaces/proyecto';

@Component({
  selector: 'app-profesional-form',
  imports: [ReactiveFormsModule],
  templateUrl: './prof-form.html',
  styleUrl: './prof-form.css',
})
export class ProfesionalForm implements OnInit {
  protected readonly fb = inject(FormBuilder);
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly client = inject(ClientUser);
  protected readonly clientProfesional = inject(ClientProfesional); // 👈 nuevo
  protected readonly clientInformacion = inject(ClientInformacionProfesional);
  protected readonly clientProyecto = inject(ClientProyecto);

  protected userData: User | null = null;

  /** Modo edición: viene del data de la ruta `editar-profesional/:userId` */
  protected readonly editando = this.route.snapshot.data['editar'] === true;
  /** id del registro de profesional a actualizar (solo en modo edición) */
  private registroId: string | null = null;
  /** Información ampliada existente, si la hay (para saber si hay que crearla o editarla) */
  private informacionExistente: InformacionProfesional | null = null;
  /** Proyectos ya guardados para este profesional (solo se muestran, no se editan acá) */
  readonly proyectosExistentes = signal<Proyecto[]>([]);

  // ===== CARRUSEL DE PASOS =====
  readonly pasoActual = signal(0);
  readonly direccionPaso = signal<'izq' | 'der'>('der');

  siguientePaso(): void {
    if (this.pasoActual() >= 5) {
      return;
    }
    this.direccionPaso.set('der');
    this.pasoActual.update((p) => p + 1);
  }

  anteriorPaso(): void {
    if (this.pasoActual() <= 0) {
      return;
    }
    this.direccionPaso.set('izq');
    this.pasoActual.update((p) => p - 1);
  }

  protected readonly form = this.fb.nonNullable.group({
    profession:            ['', [Validators.required]],
    professionalId:        ['', [Validators.required]],
    descriptionprofesional:['', [Validators.required, Validators.maxLength(500)]],
    titulos:      this.fb.array([this.crearTitulo()]),
    experiencias: this.fb.array([this.crearExperiencia()]),
    descripcionAmpliada: ['', [Validators.maxLength(2000)]],
    proyectosNuevos: this.fb.array<ReturnType<typeof this.crearProyectoNuevo>>([]),
    certificados:    this.fb.array<ReturnType<typeof this.crearCertificado>>([]),
  });

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId');

    if (!userId) {
      alert('No se encontró el usuario. Volviendo al registro.');
      this.router.navigate(['/CreateUser']);
      return;
    }

    this.client.getUserByID(userId).subscribe({
      next: (user) => {
        this.userData = user;
        if (this.editando) {
          this.cargarProfesionalExistente(userId);
        }
      },
      error: () => {
        alert('No se pudo cargar el usuario.');
        this.router.navigate(['/CreateUser']);
      }
    });
  }

  private cargarProfesionalExistente(userId: string) {
    this.clientProfesional.getProfesionalByUserID(userId).subscribe({
      next: (lista) => {
        const prof = lista[0];
        if (!prof) {
          alert('No tenés un perfil profesional para editar.');
          this.router.navigate(['/perfil-user', userId]);
          return;
        }

        this.registroId = prof.id ?? null;

        this.form.patchValue({
          profession: prof.profession,
          professionalId: prof.professionalId,
          descriptionprofesional: prof.descriptionprofesional,
        });

        this.reemplazarArray(this.titulos, prof.titulos ?? [], () => this.crearTitulo());
        this.reemplazarArray(this.experiencias, prof.experiencias ?? [], () => this.crearExperiencia());

        this.certificados.clear();
        for (const c of prof.certificados ?? []) {
          const grupo = this.crearCertificado();
          grupo.patchValue({ ...c, id: c.id != null ? String(c.id) : '' });
          this.certificados.push(grupo);
        }

        this.cargarInformacionAmpliada(prof.professionalId);
        this.cargarProyectosExistentes(prof.professionalId);
      },
      error: () => {
        alert('No se pudo cargar el perfil profesional.');
        this.router.navigate(['/perfil-user', userId]);
      }
    });
  }

  private cargarInformacionAmpliada(professionalId: string): void {
    // Nota: no se usa getInformacionByProfesional (filtro por query string) porque
    // json-server compara valores "parecidos a número" como Number, y como acá
    // professionalId se guarda como string, la comparación nunca matchea.
    this.clientInformacion.getInformaciones().subscribe({
      next: (data) => {
        this.informacionExistente = data.find((i) => String(i.professionalId) === String(professionalId)) ?? null;
        if (this.informacionExistente?.descripcionAmpliada) {
          this.form.patchValue({ descripcionAmpliada: this.informacionExistente.descripcionAmpliada });
        }
      },
      error: (err) => console.error('Error al traer la información ampliada:', err),
    });
  }

  private cargarProyectosExistentes(professionalId: string): void {
    this.clientProyecto.getProyectos().subscribe({
      next: (data) =>
        this.proyectosExistentes.set(data.filter((p) => String(p.professionalId) === String(professionalId))),
      error: (err) => console.error('Error al traer los proyectos:', err),
    });
  }

  private reemplazarArray(arr: FormArray, items: unknown[], crear: () => FormGroup) {
    arr.clear();
    if (items.length === 0) {
      arr.push(crear());
      return;
    }
    for (const item of items) {
      const grupo = crear();
      grupo.patchValue(item as Record<string, unknown>);
      arr.push(grupo);
    }
  }

  // ===== GETTERS =====
  get profession()             { return this.form.controls.profession; }
  get professionalId()         { return this.form.controls.professionalId; }
  get descriptionprofesional() { return this.form.controls.descriptionprofesional; }
  get titulos()      { return this.form.controls.titulos as FormArray; }
  get experiencias() { return this.form.controls.experiencias as FormArray; }
  get descripcionAmpliada() { return this.form.controls.descripcionAmpliada; }
  get proyectosNuevos()     { return this.form.controls.proyectosNuevos as FormArray; }
  get certificados()        { return this.form.controls.certificados as FormArray; }

  // ===== CERTIFICADOS =====
  crearCertificado() {
    return this.fb.nonNullable.group({
      id:                      [''],
      nombre_certificado:      ['', [Validators.required]],
      institucion_certificado: ['', [Validators.required]],
      fecha_obtencion:         ['', [Validators.required]],
      descripcion_certificado: ['', [Validators.maxLength(500)]],
    });
  }

  agregarCertificado() {
    this.certificados.push(this.crearCertificado());
  }

  eliminarCertificado(index: number) {
    this.certificados.removeAt(index);
  }

  // ===== PROYECTOS (nuevos, se suman a los que ya tenga el profesional) =====
  crearProyectoNuevo() {
    return this.fb.nonNullable.group({
      titulo_proyecto:      ['', [Validators.required]],
      descripcion_proyecto: ['', [Validators.required, Validators.maxLength(800)]],
      link_adjunto:         [''],
      imagen_proyecto:      [''],
    });
  }

  agregarProyectoNuevo() {
    this.proyectosNuevos.push(this.crearProyectoNuevo());
  }

  eliminarProyectoNuevo(index: number) {
    this.proyectosNuevos.removeAt(index);
  }

  onImagenProyectoNuevo(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      (this.proyectosNuevos.at(index) as FormGroup).patchValue({ imagen_proyecto: lector.result as string });
    };
    lector.readAsDataURL(file);
    input.value = '';
  }

  // ===== TITULOS =====
  crearTitulo() {
    return this.fb.nonNullable.group({
      nombre_titulo:          ['', [Validators.required]],
      descripcion_titulo:     ['', [Validators.required, Validators.maxLength(300)]],
      fecha_obtencion:        ['', [Validators.required]],
      institucion_educativa:  ['', [Validators.required]],
    });
  }

  agregarTitulo() {
    this.titulos.push(this.crearTitulo());
  }

  eliminarTitulo(index: number) {
    this.titulos.removeAt(index);
  }

  // ===== EXPERIENCIAS =====
  crearExperiencia() {
    return this.fb.nonNullable.group({
      titulo_experiencia:      ['', [Validators.required]],
      institucion_experiencia: ['', [Validators.required]],
      fecha_inicio:            ['', [Validators.required]],
      fecha_fin:               [''],
    });
  }

  agregarExperiencia() {
    this.experiencias.push(this.crearExperiencia());
  }

  eliminarExperiencia(index: number) {
    this.experiencias.removeAt(index);
  }

  // ===== SUBMIT =====
  /** Guarda la descripción ampliada y los proyectos nuevos, ya con el professionalId confirmado */
  private guardarExtras(
    professionalId: string,
    descripcionAmpliada: string,
    proyectosNuevos: { titulo_proyecto: string; descripcion_proyecto: string; link_adjunto: string; imagen_proyecto: string }[],
  ): Observable<unknown> {
    const tareas: Observable<unknown>[] = [];

    const descripcionTrim = descripcionAmpliada.trim();
    if (descripcionTrim) {
      const datosInfo: InformacionProfesional = {
        professionalId,
        profesional_userData: this.userData!,
        descripcionAmpliada: descripcionTrim,
      };
      tareas.push(
        this.informacionExistente?.id
          ? this.clientInformacion.updateInformacion(this.informacionExistente.id, {
              ...datosInfo,
              id: this.informacionExistente.id,
            })
          : this.clientInformacion.addInformacion(datosInfo),
      );
    }

    for (const p of proyectosNuevos) {
      const nuevoProyecto: Proyecto = {
        professionalId,
        titulo_proyecto: p.titulo_proyecto.trim(),
        fecha_inicio: '',
        fecha_finalizacion: '',
        descripcion_proyecto: p.descripcion_proyecto.trim(),
        imagen_proyecto: p.imagen_proyecto,
        link_adjunto: p.link_adjunto.trim(),
      };
      tareas.push(this.clientProyecto.addProyecto(nuevoProyecto));
    }

    return tareas.length ? forkJoin(tareas) : of(null);
  }

  handleSubmit() {
    if (this.form.invalid || !this.userData) {
      alert('Formulario invalido o usuario no cargado!');
      return;
    }

    const raw = this.form.getRawValue();
    const { descripcionAmpliada, proyectosNuevos, certificados, ...resto } = raw;

    const certificadosFinal = certificados.map((c, i) => ({
      ...c,
      id: c.id || `c-${Date.now()}-${i}`,
    }));

    if (this.editando) {
      if (!this.registroId) {
        alert('No se encontró el perfil profesional a editar.');
        return;
      }
      if (!confirm('¿Guardar los cambios en tu perfil profesional?')) {
        return;
      }

      const profesional_editado: Profesional = {
        id: this.registroId,
        profesional_userData: this.userData,
        ...resto,
        certificados: certificadosFinal,
      };

      this.clientProfesional.updateProfesional(this.registroId, profesional_editado).subscribe(() => {
        this.guardarExtras(resto.professionalId, descripcionAmpliada, proyectosNuevos).subscribe(() => {
          alert('Perfil profesional actualizado con éxito!');
          this.router.navigate(['/perfil-prof', this.userData!.id]);
        });
      });
      return;
    }

    if (confirm('Desea registrar este perfil profesional?')) {
      const new_profesional: Profesional = {
        profesional_userData: this.userData,
        ...resto,
        certificados: certificadosFinal,
      };

      this.clientProfesional.addProfesional(new_profesional).subscribe(() => {
        this.guardarExtras(resto.professionalId, descripcionAmpliada, proyectosNuevos).subscribe(() => {
          alert('Perfil profesional registrado con éxito!');
          this.router.navigate(['/']);
        });
      });
    }
  }
}