import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ContenidoProfesionalCliente } from '../interfaces/contenido-profesional-cliente';

@Injectable({
  providedIn: 'root',
})
export class ClientContenido {
  protected readonly http = inject(HttpClient); ///Inyectamos el HttpClient para hacer peticiones HTTP al backend
  protected readonly url = 'http://localhost:3000/contenido-profesional-cliente'; ///URL del backend para el contenido profesional-cliente

  ///GET - Contenido de un profesional (ambos tipos)
  getContenidoPorProfesional(professionalId: string | number) {
    return this.http.get<ContenidoProfesionalCliente[]>(`${this.url}?professionalId=${professionalId}`);
  }

  ///POST - Agregar contenido
  addContenido(nuevo_contenido: ContenidoProfesionalCliente) {
    return this.http.post<ContenidoProfesionalCliente>(this.url, nuevo_contenido);
  }

  ///PUT - Editar contenido
  updateContenido(id: string | number, contenido_editado: ContenidoProfesionalCliente) {
    return this.http.put<ContenidoProfesionalCliente>(`${this.url}/${id}`, contenido_editado);
  }

  ///DELETE - Eliminar contenido
  deleteContenido(id: string | number) {
    return this.http.delete<ContenidoProfesionalCliente>(`${this.url}/${id}`);
  }
}
