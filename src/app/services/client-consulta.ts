import { inject, Injectable } from '@angular/core';
import { Consulta } from '../interfaces/consulta';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientConsulta {
  protected readonly db = inject(SupabaseDb);

  /** La base devuelve solo las consultas que el usuario envió o recibió */
  getConsultas() {
    return this.db.listar<Consulta>('consultas');
  }

  addConsulta(nueva_consulta: Consulta) {
    return this.db.insertar<Consulta>('consultas', nueva_consulta);
  }

  responder(id: string, respuesta: string) {
    return this.db.actualizar<Consulta>('consultas', id, {
      respuesta: respuesta.trim(),
      fechaRespuesta: new Date().toISOString(),
    });
  }
}
