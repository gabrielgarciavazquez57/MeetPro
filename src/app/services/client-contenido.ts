import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ContenidoProfesionalCliente } from '../interfaces/contenido-profesional-cliente';

@Injectable({
  providedIn: 'root',
})
export class ClientContenido {
  protected readonly http = inject(HttpClient); ///Inyectamos el HttpClient para hacer peticiones HTTP al backend
  protected readonly url = 'http://localhost:3000/contenido-profesional-cliente'; ///URL del backend para el contenido profesional-cliente

  ///GET - Todo el contenido
  ///Nota: no filtramos por professionalId en el query string porque json-server
  ///(v1 beta) compara valores que "parecen número" como Number, y como acá
  ///professionalId se guarda como string, la comparación estricta nunca matchea.
  ///Por eso se trae todo y se filtra en el componente, igual que con los profesionales.
  getContenido() {
    return this.http.get<ContenidoProfesionalCliente[]>(this.url);
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
