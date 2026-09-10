import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Valoracion } from '../interfaces/valoracion';

@Injectable({
  providedIn: 'root',
})
export class ClientValoracion {
  protected readonly http = inject(HttpClient);
  protected readonly url = 'http://localhost:3000/valoraciones';

  ///GET - Todas las valoraciones
  getValoraciones() {
    return this.http.get<Valoracion[]>(this.url);
  }

  ///GET - Valoraciones de un profesional
  getValoracionesByProfesional(professionalId: string) {
    return this.http.get<Valoracion[]>(`${this.url}?professionalId=${professionalId}`);
  }

  ///POST - Agregar valoración
  addValoracion(nueva_valoracion: Valoracion) {
    return this.http.post<Valoracion>(this.url, nueva_valoracion);
  }

  ///DELETE - Eliminar valoración
  deleteValoracion(id: string | number) {
    return this.http.delete<Valoracion>(`${this.url}/${id}`);
  }
}
