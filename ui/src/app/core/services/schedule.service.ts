import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ScheduleItem } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly api = inject(ApiService);

  list(from: string, to: string): Observable<ScheduleItem[]> {
    return this.api.get('/schedule', { from, to });
  }
}
