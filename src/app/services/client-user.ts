import { inject, Injectable } from '@angular/core';
import { User } from '../interfaces/user';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})

export class ClientUser {
  protected readonly db = inject(SupabaseDb);

  getUsers() {
    return this.db.listar<User>('users');
  }

  getUserByID(id_bus: string | number) {
    return this.db.obtener<User>('users', id_bus);
  }

  addUser(new_user: User) {
    return this.db.insertar<User>('users', new_user);
  }

  updateUser(id_bus: string | number, updated_user: User) {
    return this.db.reemplazar<User>('users', id_bus, updated_user);
  }

  deleteUser(id_bus: string | number) {
    return this.db.eliminar('users', id_bus);
  }
}
