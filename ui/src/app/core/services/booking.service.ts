import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Booking,
  BookingCancelInput,
  BookingCompleteInput,
  BookingCompleteResult,
  BookingCreateInput,
  BookingFilters,
  BookingSummary,
  BookingUpdateInput,
  PaymentInput,
} from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  list(filters: BookingFilters = {}): Observable<BookingSummary[]> {
    return this.api.get('/bookings', {
      status: filters.status,
      from: filters.from,
      to: filters.to,
      devoteeId: filters.devoteeId,
      balanceDue: filters.balanceDue,
    });
  }

  get(id: number): Observable<Booking> {
    return this.api.get(`/bookings/${id}`);
  }

  create(input: BookingCreateInput, force = false): Observable<Booking> {
    return this.api.post(`/bookings${force ? '?force=true' : ''}`, input);
  }

  update(id: number, input: BookingUpdateInput): Observable<Booking> {
    return this.api.put(`/bookings/${id}`, input);
  }

  addPayment(id: number, input: PaymentInput): Observable<Booking> {
    return this.api.post(`/bookings/${id}/payments`, input);
  }

  complete(id: number, input: BookingCompleteInput): Observable<BookingCompleteResult> {
    return this.api.post(`/bookings/${id}/complete`, input);
  }

  cancel(id: number, input: BookingCancelInput = {}): Observable<Booking> {
    return this.api.post(`/bookings/${id}/cancel`, input);
  }
}
