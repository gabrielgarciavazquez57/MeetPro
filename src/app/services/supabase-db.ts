import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defer, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Tabla =
  | 'users'
  | 'profesionales'
  | 'turnos'
  | 'valoraciones'
  | 'informacionesProfesionales'
  | 'proyectos'
  | 'contenido-profesional-cliente'
  | 'notificaciones'
  | 'consultas';

/** Columnas de cada tabla (deben coincidir con supabase/schema.sql) */
const COLUMNAS: Record<Tabla, string[]> = {
  users: [
    'id', 'auth_id', 'username', 'isProfesional', 'isAdmin', 'name', 'lastname', 'dni', 'email',
    'phoneNumber', 'gender', 'nationality', 'dateOfBirth', 'fotoPerfil', 'address', 'age',
  ],
  profesionales: [
    'id', 'profesional_userData', 'profession', 'professionalId', 'descriptionprofesional', 'linkedin',
    'titulos', 'experiencias', 'certificados', 'linkReunion', 'direccionPresencial', 'pago',
  ],
  turnos: [
    'id', 'professionalId', 'fecha', 'hora', 'duracion', 'modalidad', 'estado', 'cliente', 'motivo',
    'notaProfesional', 'canceladoPor', 'motivoCancelacion', 'enlaceReunion',
  ],
  valoraciones: ['id', 'professionalId', 'userId', 'nombre', 'apellido', 'fecha', 'puntaje', 'descripcion'],
  informacionesProfesionales: ['id', 'professionalId', 'profesional_userData', 'descripcionAmpliada'],
  proyectos: [
    'id', 'professionalId', 'titulo_proyecto', 'fecha_inicio', 'fecha_finalizacion',
    'descripcion_proyecto', 'imagen_proyecto', 'link_adjunto',
  ],
  'contenido-profesional-cliente': [
    'id', 'professionalId', 'tipo', 'dniCliente', 'titulo', 'fecha', 'hora', 'descripcion', 'link',
  ],
  notificaciones: ['id', 'user_id', 'tipo', 'titulo', 'mensaje', 'enlace', 'leida', 'creada', 'ref'],
  consultas: [
    'id', 'professionalId', 'userId', 'nombre', 'apellido', 'email', 'titulo', 'descripcion',
    'respuesta', 'fechaRespuesta', 'creada',
  ],
};

/** Columnas donde null es un valor real y no "campo ausente" */
const NULL_VALIDO = new Set(['cliente']);

/** Datos del usuario que sí pueden verse en las copias dentro de profesionales e información */
const CAMPOS_PUBLICOS = ['id', 'isProfesional', 'name', 'lastname', 'email', 'phoneNumber', 'fotoPerfil'];

function aDatosPublicos(usuario: unknown): unknown {
  if (!usuario || typeof usuario !== 'object') {
    return usuario;
  }
  const origen = usuario as Record<string, unknown>;
  const publico: Record<string, unknown> = {};
  for (const campo of CAMPOS_PUBLICOS) {
    if (origen[campo] !== undefined) {
      publico[campo] = origen[campo];
    }
  }
  const dir = origen['address'] as Record<string, unknown> | undefined;
  if (dir) {
    publico['address'] = { city: dir['city'], province: dir['province'], country: dir['country'] };
  }
  return publico;
}

type Fila = Record<string, unknown>;
type Respuesta = { data: unknown; error: { message: string } | null };

@Injectable({
  providedIn: 'root',
})
export class SupabaseDb {
  /** Cliente de Supabase compartido (base de datos y autenticación) */
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  private readonly sb = this.client;

  listar<T>(tabla: Tabla): Observable<T[]> {
    return this.ejecutar(() => this.sb.from(tabla).select('*').limit(5000)).pipe(
      map((filas) => (filas as Fila[]).map((f) => this.limpiar<T>(f))),
    );
  }

  /** Filtra por una columna. Para campos dentro de un jsonb: 'profesional_userData->>id' */
  listarDonde<T>(tabla: Tabla, columna: string, valor: string | number): Observable<T[]> {
    return this.ejecutar(() => this.sb.from(tabla).select('*').eq(columna, String(valor))).pipe(
      map((filas) => (filas as Fila[]).map((f) => this.limpiar<T>(f))),
    );
  }

  obtener<T>(tabla: Tabla, id: string | number): Observable<T> {
    return this.ejecutar(() => this.sb.from(tabla).select('*').eq('id', String(id)).maybeSingle()).pipe(
      map((fila) => {
        if (!fila) {
          throw new Error(`No se encontró ${tabla}/${id}`);
        }
        return this.limpiar<T>(fila as Fila);
      }),
    );
  }

  insertar<T>(tabla: Tabla, cuerpo: object): Observable<T> {
    const fila = this.preparar(tabla, cuerpo as Fila, false);
    fila['id'] = fila['id'] ?? this.nuevoId();
    return this.ejecutar(() => this.sb.from(tabla).insert(fila).select().single()).pipe(
      map((f) => this.limpiar<T>(f as Fila)),
    );
  }

  /** Reemplaza el registro completo (como PUT): lo que no se envía queda en null */
  reemplazar<T>(tabla: Tabla, id: string | number, cuerpo: object): Observable<T> {
    const fila = this.preparar(tabla, { ...(cuerpo as Fila), id: String(id) }, true);
    return this.ejecutar(() => this.sb.from(tabla).update(fila).eq('id', String(id)).select().single()).pipe(
      map((f) => this.limpiar<T>(f as Fila)),
    );
  }

  /** Cambia solo los campos indicados (como PATCH) */
  actualizar<T>(tabla: Tabla, id: string | number, cambios: object): Observable<T> {
    const fila = this.preparar(tabla, cambios as Fila, false);
    delete fila['id'];
    return this.ejecutar(() => this.sb.from(tabla).update(fila).eq('id', String(id)).select().single()).pipe(
      map((f) => this.limpiar<T>(f as Fila)),
    );
  }

  eliminar(tabla: Tabla, id: string | number): Observable<null> {
    return this.ejecutar(() => this.sb.from(tabla).delete().eq('id', String(id))).pipe(map(() => null));
  }

  /** Llama a una función de la base de datos */
  rpc<T>(funcion: string, args: object): Observable<T> {
    return this.ejecutar(() => this.sb.rpc(funcion, args)).pipe(map((r) => r as T));
  }

  private ejecutar(consulta: () => PromiseLike<Respuesta>): Observable<unknown> {
    return defer(() => consulta()).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return data;
      }),
    );
  }

  /** Deja solo las columnas de la tabla; con completar, las que faltan van en null */
  private preparar(tabla: Tabla, cuerpo: Fila, completar: boolean): Fila {
    const fila: Fila = {};
    for (const col of COLUMNAS[tabla]) {
      const valor = cuerpo[col];
      if (valor !== undefined) {
        fila[col] = valor;
      } else if (completar && col !== 'auth_id') {
        fila[col] = null;
      }
    }
    if ((tabla === 'profesionales' || tabla === 'informacionesProfesionales') && fila['profesional_userData']) {
      fila['profesional_userData'] = aDatosPublicos(fila['profesional_userData']);
    }
    return fila;
  }

  /** Postgres devuelve null en campos ausentes; json-server directamente no los traía */
  private limpiar<T>(fila: Fila): T {
    const limpia: Fila = {};
    for (const [k, v] of Object.entries(fila)) {
      if (v !== null || NULL_VALIDO.has(k)) {
        limpia[k] = v;
      }
    }
    return limpia as T;
  }

  private nuevoId(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 11);
  }
}
