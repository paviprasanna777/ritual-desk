import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span class="status-chip" [class]="statusClass">{{ status }}</span>`,
  styles: [`
    .status-chip { display:inline-flex; min-height:28px; align-items:center; padding:0 10px; border-radius:999px; background:var(--rd-border); color:var(--rd-ink); font-size:12px; font-weight:700; text-transform:capitalize; }
    .booked { background:var(--rd-booked); }
    .scheduled { background:var(--rd-scheduled); }
    .completed { background:var(--rd-completed); }
    .cancelled { background:var(--rd-cancelled); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChipComponent {
  @Input({ required: true }) status = '';

  get statusClass(): string {
    return `status-chip ${this.status.toLowerCase()}`;
  }
}
