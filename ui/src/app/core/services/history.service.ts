import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HistorySummary } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly api = inject(ApiService);

  list(month: string): Observable<HistorySummary> {
    return this.api.get('/history', { month });
  }
}
