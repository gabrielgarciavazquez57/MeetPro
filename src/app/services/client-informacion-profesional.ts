import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InformacionProfesional } from '../interfaces/informacion-profesional';

@Injectable({
  providedIn: 'root',
})
export class ClientInformacionProfesional {
  protected readonly http = inject(HttpClient);
  protected readonly url = 'http://localhost:3000/informacionesProfesionales';

  ///GET - Toda la información profesional
  getInformaciones() {
    return this.http.get<InformacionProfesional[]>(this.url);
  }

  ///GET - Información de un profesional
  getInformacionByProfesional(professionalId: string) {
    return this.http.get<InformacionProfesional[]>(`${this.url}?professionalId=${professionalId}`);
  }

  ///POST - Agregar información
  addInformacion(nueva_informacion: InformacionProfesional) {
    return this.http.post<InformacionProfesional>(this.url, nueva_informacion);
  }

  ///PUT - Editar información
  updateInformacion(id: string | number, informacion_actualizada: InformacionProfesional) {
    return this.http.put<InformacionProfesional>(`${this.url}/${id}`, informacion_actualizada);
  }
}
