import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Profesional } from '../interfaces/profesional';

@Injectable({
  providedIn: 'root',
})
export class ClientProfesional {
  protected readonly http = inject(HttpClient); ///Inyectamos el HttpClient para poder hacer peticiones HTTP a nuestro backend
  protected readonly url = 'http://localhost:3000/profesionales'; ///URL de nuestro backend para los profesionales

  ///GET
  getProfesionales() { ///Traemos con GET a los profesionales
    return this.http.get<Profesional[]>(this.url);
  }

  ///GET - ID
  getProfesionalByID(id_bus: string | number) { ///Traemos con GET a un profesional por su ID
    return this.http.get<Profesional>(`${this.url}/${id_bus}`);
  }

  ///POST - Agregar Profesional
  addProfesional(new_profesional: Profesional) { ///Agregamos con POST a un nuevo profesional
    return this.http.post<Profesional>(this.url, new_profesional);
  }

  ///PUT - Editar Profesional
  updateProfesional(id_bus: string | number, updated_profesional: Profesional) { ///Editamos con PUT a un profesional por su ID
    return this.http.put<Profesional>(`${this.url}/${id_bus}`, updated_profesional);
  }

  ///DELETE - Eliminar profesional
  deleteProfesional(id_bus: string | number) {
    return this.http.delete<Profesional>(`${this.url}/${id_bus}`);
  }
}