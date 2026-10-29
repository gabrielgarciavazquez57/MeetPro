import { inject, Injectable } from '@angular/core';
import { Ticket } from '../interfaces/ticket';
import { SupabaseDb } from './supabase-db';

@Injectable({
  providedIn: 'root',
})
export class ClientTicket {
  protected readonly db = inject(SupabaseDb);

  /** La base devuelve solo los tickets de pagos que el usuario hizo o recibió */
  getTickets() {
    return this.db.listar<Ticket>('tickets');
  }

  addTicket(nuevo_ticket: Ticket) {
    return this.db.insertar<Ticket>('tickets', nuevo_ticket);
  }
}
