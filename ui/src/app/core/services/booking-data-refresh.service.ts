import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookingDataRefreshService {
  readonly revision = signal(0);

  refresh(): void {
    this.revision.update((revision) => revision + 1);
  }
}
