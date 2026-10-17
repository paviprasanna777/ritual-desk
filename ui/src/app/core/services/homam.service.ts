import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HomamType, HomamTypeInput } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class HomamService {
  private readonly api = inject(ApiService);

  list(all = false): Observable<HomamType[]> {
    return this.api.get('/homams', { all: all ? 'true' : undefined });
  }

  create(input: HomamTypeInput): Observable<HomamType> {
    return this.api.post('/homams', this.toApiInput(input));
  }

  update(id: number, input: HomamTypeInput): Observable<HomamType> {
    return this.api.put(`/homams/${id}`, this.toApiInput(input));
  }

  delete(id: number): Observable<{ deleted: boolean }> {
    return this.api.delete(`/homams/${id}`);
  }

  private toApiInput(input: HomamTypeInput): object {
    return {
      name: input.name,
      default_amount: input.defaultAmount,
      duration_mins: input.durationMins,
      items_needed: input.itemsNeeded,
      notes: input.notes,
    };
  }
}
