import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Reminder, ReminderInput } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly api = inject(ApiService);

  list(date?: string): Observable<Reminder[]> {
    return this.api.get('/reminders', { date });
  }

  get(id: number): Observable<Reminder> {
    return this.api.get(`/reminders/${id}`);
  }

  create(input: ReminderInput): Observable<Reminder> {
    return this.api.post('/reminders', input);
  }

  update(id: number, changes: Partial<ReminderInput>): Observable<Reminder> {
    return this.api.put(`/reminders/${id}`, changes);
  }

  delete(id: number): Observable<{ deleted: boolean }> {
    return this.api.delete(`/reminders/${id}`);
  }
}
