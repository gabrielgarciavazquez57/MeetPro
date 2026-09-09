import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Turno } from '../interfaces/turno';

@Injectable({
  providedIn: 'root',
})
export class ClientTurno {
  protected readonly http = inject(HttpClient); ///Inyectamos el HttpClient para hacer peticiones HTTP al backend
  protected readonly url = 'http://localhost:3000/turnos'; ///URL del backend para los turnos

  ///GET - Todos los turnos
  getTurnos() {
    return this.http.get<Turno[]>(this.url);
  }

  ///GET - Turno por ID
  getTurnoById(id: string | number) {
    return this.http.get<Turno>(`${this.url}/${id}`);
  }

  ///POST - Agregar turno
  addTurno(nuevo_turno: Turno) {
    return this.http.post<Turno>(this.url, nuevo_turno);
  }

  ///PUT - Editar turno
  updateTurno(id: string | number, turno_editado: Turno) {
    return this.http.put<Turno>(`${this.url}/${id}`, turno_editado);
  }

  ///DELETE - Eliminar turno
  deleteTurno(id: string | number) {
    return this.http.delete<Turno>(`${this.url}/${id}`);
  }
}
