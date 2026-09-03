import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../interfaces/user';

@Injectable({
  providedIn: 'root',
})

export class ClientUser {
  protected readonly http = inject(HttpClient);///Inyectamos el HttpClient para poder hacer peticiones HTTP a nuestro backend
  protected readonly url = 'http://localhost:3000/users';///URL de nuestro backend para los usuarios

  ///GET
  getUsers(){///Traermos con GET a los users
    return this.http.get<User[]>(this.url);
  }

  ///GET - ID
  getUserByID(id_bus: string | number){///Traemos con GET a un user por su ID
    return this.http.get<User>(`${this.url}/${id_bus}`);
  }

  ///POST - Agergar Usuario
  addUser(new_user : User){///Agregamos con POST a un nuevo user
    return this.http.post<User>(this.url, new_user);
  }

  ///PUT - Editar Usuario
  updateUser(id_bus: string | number, updated_user : User){///Editamos con PUT a un user por su ID
    return this.http.put<User>(`${this.url}/${id_bus}`, updated_user);
  }

  ///DELETE - Elimiar user
  deleteUser(id_bus: string | number){
    return this.http.delete<User>(`${this.url}/${id_bus}`);
  }



}
