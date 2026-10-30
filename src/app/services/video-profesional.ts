import { Injectable, inject } from '@angular/core';
import { catchError, defer, map, Observable, of } from 'rxjs';
import { SupabaseDb } from './supabase-db';
import { VideoProfesional } from '../interfaces/video-profesional';

const BUCKET = 'videos';
const MAXIMO_MB = 50;
const MAXIMO_BYTES = MAXIMO_MB * 1024 * 1024;
const TIPOS_PERMITIDOS = ['video/mp4', 'video/webm', 'video/quicktime'];

@Injectable({
  providedIn: 'root',
})
export class VideoProfesionalService {
  private readonly db = inject(SupabaseDb);

  /** Atributo accept para el input de archivo */
  readonly accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
  readonly maximoMb = MAXIMO_MB;

  /** Devuelve el motivo por el que el video no se puede subir, o null si es válido */
  validar(archivo: File): string | null {
    if (!TIPOS_PERMITIDOS.includes(this.tipoDe(archivo))) {
      return 'Solo se admiten videos MP4, WEBM o MOV.';
    }
    if (archivo.size > MAXIMO_BYTES) {
      return `El video supera el máximo de ${MAXIMO_MB} MB.`;
    }
    return null;
  }

  /** Sube el video a la carpeta del usuario y devuelve el video listo para guardar en el perfil */
  subir(archivo: File, userId: string): Observable<VideoProfesional> {
    const ruta = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${this.limpiarNombre(archivo.name)}`;
    const almacen = this.db.client.storage.from(BUCKET);

    return defer(() => almacen.upload(ruta, archivo, { contentType: this.tipoDe(archivo), upsert: false })).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return { tipo: 'archivo' as const, url: almacen.getPublicUrl(ruta).data.publicUrl, nombre: archivo.name };
      }),
    );
  }

  /** Borra un video subido antes. Si falla no se interrumpe nada: solo quedaría un archivo huérfano */
  eliminar(url: string): Observable<void> {
    const ruta = this.rutaDe(url);
    if (!ruta) {
      return of(undefined);
    }
    return defer(() => this.db.client.storage.from(BUCKET).remove([ruta])).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  private tipoDe(archivo: File): string {
    if (archivo.type) {
      return archivo.type;
    }
    const nombre = archivo.name.toLowerCase();
    if (nombre.endsWith('.mp4')) return 'video/mp4';
    if (nombre.endsWith('.webm')) return 'video/webm';
    if (nombre.endsWith('.mov')) return 'video/quicktime';
    return '';
  }

  private limpiarNombre(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .slice(-80);
  }

  private rutaDe(url: string): string | null {
    const marca = `/object/public/${BUCKET}/`;
    const i = url.indexOf(marca);
    return i < 0 ? null : decodeURIComponent(url.slice(i + marca.length));
  }
}
