import { Injectable, inject } from '@angular/core';
import { catchError, defer, map, Observable, of } from 'rxjs';
import { SupabaseDb } from './supabase-db';

const BUCKET = 'adjuntos';
const MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export interface ArchivoSubido {
  url: string;
  nombre: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdjuntosService {
  private readonly db = inject(SupabaseDb);

  /** Atributo accept para los input de archivo */
  readonly accept = '.pdf,image/jpeg,image/png,image/webp';

  /** Devuelve el motivo por el que el archivo no se puede subir, o null si es válido */
  validar(archivo: File): string | null {
    if (!TIPOS_PERMITIDOS.includes(this.tipoDe(archivo))) {
      return 'Solo se admiten archivos PDF o imágenes (JPG, PNG o WEBP).';
    }
    if (archivo.size > MAXIMO_BYTES) {
      return 'El archivo supera el máximo de 5 MB.';
    }
    return null;
  }

  /** Sube el archivo a la carpeta del usuario y devuelve su link público */
  subir(archivo: File, userId: string): Observable<ArchivoSubido> {
    const ruta = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${this.limpiarNombre(archivo.name)}`;
    const almacen = this.db.client.storage.from(BUCKET);

    return defer(() => almacen.upload(ruta, archivo, { contentType: this.tipoDe(archivo), upsert: false })).pipe(
      map(({ error }) => {
        if (error) {
          throw new Error(error.message);
        }
        return { url: almacen.getPublicUrl(ruta).data.publicUrl, nombre: archivo.name };
      }),
    );
  }

  /** Borra un archivo subido antes. Si falla no se interrumpe nada: solo quedaría un archivo huérfano */
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

  /**
   * Los archivos viejos del formulario del profesional se guardaron como data URL, que el navegador
   * bloquea al abrirse en una pestaña nueva: se convierten en un enlace temporal antes de abrirlos.
   */
  abrir(url: string, evento: Event): void {
    if (!url.startsWith('data:')) {
      return;
    }
    evento.preventDefault();
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => window.open(URL.createObjectURL(blob), '_blank'));
  }

  private tipoDe(archivo: File): string {
    if (archivo.type) {
      return archivo.type;
    }
    return archivo.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '';
  }

  private limpiarNombre(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .slice(-80);
  }

  private rutaDe(url: string): string | null {
    const marca = `/object/public/${BUCKET}/`;
    const i = url.indexOf(marca);
    return i < 0 ? null : decodeURIComponent(url.slice(i + marca.length));
  }
}
