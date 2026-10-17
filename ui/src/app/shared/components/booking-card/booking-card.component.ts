import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { StatusChipComponent } from '../status-chip/status-chip.component';

export interface BookingCardData {
  id: number;
  homamName: string;
  devoteeName: string;
  scheduledAt: string | null;
  location: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
}

@Component({
  selector: 'app-booking-card',
  standalone: true,
  template: `
    @if (interactive) {
      <button class="booking-card rd-card" type="button" (click)="selected.emit(booking.id)">
        <ng-container *ngTemplateOutlet="cardContent"></ng-container>
      </button>
    } @else {
      <article class="booking-card rd-card">
        <ng-container *ngTemplateOutlet="cardContent"></ng-container>
      </article>
    }
    <ng-template #cardContent>
      <span class="card-top">
        <span class="title-block">
          <strong>{{ booking.homamName }}</strong>
          <small>{{ booking.devoteeName }}</small>
        </span>
        <app-status-chip [status]="booking.status"></app-status-chip>
      </span>
      <span class="details">
        @if (booking.scheduledAt) {
          <span>{{ booking.scheduledAt | date: 'mediumDate' }} · {{ booking.scheduledAt | date: 'shortTime' }}</span>
        } @else {
          <span>Not scheduled</span>
        }
        @if (booking.location) {
          <span>{{ booking.location }}</span>
        }
      </span>
      <span class="amounts">
        <span>Total <strong>{{ booking.totalAmount | currency: 'INR':'symbol':'1.0-0':'en-IN' }}</strong></span>
        <span>Paid <strong>{{ booking.paidAmount | currency: 'INR':'symbol':'1.0-0':'en-IN' }}</strong></span>
        @if (booking.balance > 0) {
          <span>Due <strong>{{ booking.balance | currency: 'INR':'symbol':'1.0-0':'en-IN' }}</strong></span>
        } @else {
          <span class="settled">Settled</span>
        }
      </span>
    </ng-template>
  `,
  styles: [`
    .booking-card { display:flex; width:100%; min-height:var(--rd-tap-target); flex-direction:column; gap:12px; padding:16px; color:var(--rd-ink); text-align:left; font:inherit; }
    .card-top,.title-block,.details,.amounts { display:flex; }
    .card-top { align-items:flex-start; justify-content:space-between; gap:10px; }
    .title-block,.details { min-width:0; flex-direction:column; gap:3px; }
    .title-block strong { color:var(--rd-ink); font-size:16px; }
    small,.details { color:var(--rd-muted); font-size:13px; }
    .amounts { flex-wrap:wrap; gap:8px 14px; color:var(--rd-muted); font-size:12px; }
    .amounts strong { margin-left:3px; color:var(--rd-ink); }
    .settled { color:#287a43; font-weight:700; }
  `],
  imports: [CurrencyPipe, DatePipe, NgTemplateOutlet, StatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingCardComponent {
  @Input({ required: true }) booking!: BookingCardData;
  @Input() interactive = true;
  @Output() readonly selected = new EventEmitter<number>();
}
