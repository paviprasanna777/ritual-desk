import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Devotee, DevoteeDetail, DevoteeInput } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DevoteeService {
  private readonly api = inject(ApiService);

  list(search = ''): Observable<Devotee[]> {
    return this.api.get('/devotees', { search });
  }

  get(id: number): Observable<DevoteeDetail> {
    return this.api.get(`/devotees/${id}`);
  }

  create(input: DevoteeInput): Observable<Devotee> {
    return this.api.post('/devotees', input);
  }

  update(id: number, input: DevoteeInput): Observable<Devotee> {
    return this.api.put(`/devotees/${id}`, input);
  }

  delete(id: number): Observable<{ deleted: boolean }> {
    return this.api.delete(`/devotees/${id}`);
  }
}
