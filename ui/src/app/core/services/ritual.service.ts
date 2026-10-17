import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Ritual, RitualInput } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RitualService {
  private readonly api = inject(ApiService);

  list(): Observable<Ritual[]> {
    return this.api.get('/rituals');
  }

  get(id: number): Observable<Ritual> {
    return this.api.get(`/rituals/${id}`);
  }

  create(input: RitualInput): Observable<Ritual> {
    return this.api.post('/rituals', input);
  }

  update(id: number, input: RitualInput): Observable<Ritual> {
    return this.api.put(`/rituals/${id}`, input);
  }

  delete(id: number): Observable<{ deleted: boolean }> {
    return this.api.delete(`/rituals/${id}`);
  }

  log(id: number, date: string): Observable<{ ritualId: number; date: string; done: boolean }> {
    return this.api.post(`/rituals/${id}/log`, { date });
  }

  removeLog(
    id: number,
    date: string,
  ): Observable<{ ritualId: number; date: string; done: boolean }> {
    return this.api.delete(`/rituals/${id}/log/${date}`);
  }
}
