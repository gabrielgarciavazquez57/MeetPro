import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { User } from '../interfaces/user';
import { SupabaseDb } from './supabase-db';

export interface DisponibilidadDatos {
  username: boolean;
  dni: boolean;
  email: boolean;
}

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

  /** Perfil del usuario vinculado a una cuenta de Auth */
  getUserByAuthId(authId: string) {
    return this.db.listarDonde<User>('users', 'auth_id', authId).pipe(map((lista) => lista[0] ?? null));
  }

  addUser(new_user: User) {
    return this.db.insertar<User>('users', new_user);
  }

  updateUser(id_bus: string | number, updated_user: User) {
    return this.db.actualizar<User>('users', id_bus, updated_user);
  }

  deleteUser(id_bus: string | number) {
    return this.db.eliminar('users', id_bus);
  }

  /** Indica si el username, DNI y email están libres (sin leer la tabla de usuarios) */
  datosDisponibles(datos: { username?: string; dni?: string; email?: string }, excluirId?: string | number | null) {
    return this.db.rpc<DisponibilidadDatos>('usuario_disponible', {
      p_username: datos.username ?? '',
      p_dni: datos.dni ?? '',
      p_email: datos.email ?? '',
      p_excluir: excluirId == null ? null : String(excluirId),
    });
  }
}
