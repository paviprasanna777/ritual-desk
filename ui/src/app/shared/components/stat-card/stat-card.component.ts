import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <article class="stat-card rd-card">
      <span>{{ label }}</span>
      <strong>{{ value }}</strong>
      @if (detail) {
        <small>{{ detail }}</small>
      }
    </article>
  `,
  styles: [`
    .stat-card { display:flex; min-width:0; min-height:108px; flex-direction:column; justify-content:center; gap:5px; padding:14px; }
    span,small { color:var(--rd-muted); font-size:13px; }
    strong { overflow-wrap:anywhere; color:var(--rd-ink); font:500 25px Fraunces, Georgia, serif; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() detail = '';
}
