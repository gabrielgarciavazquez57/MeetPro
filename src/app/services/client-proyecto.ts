import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Proyecto } from '../interfaces/proyecto';

@Injectable({
  providedIn: 'root',
})
export class ClientProyecto {
  protected readonly http = inject(HttpClient);
  protected readonly url = 'http://localhost:3000/proyectos';

  ///GET - Todos los proyectos
  getProyectos() {
    return this.http.get<Proyecto[]>(this.url);
  }

  ///POST - Agregar proyecto
  addProyecto(nuevo_proyecto: Proyecto) {
    return this.http.post<Proyecto>(this.url, nuevo_proyecto);
  }

  ///DELETE - Eliminar proyecto
  deleteProyecto(id: string | number) {
    return this.http.delete<Proyecto>(`${this.url}/${id}`);
  }
}
