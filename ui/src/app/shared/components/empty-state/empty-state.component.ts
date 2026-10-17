import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty-state rd-card">
      <span aria-hidden="true">✦</span>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
    </section>
  `,
  styles: [`
    .empty-state { display:grid; justify-items:center; gap:8px; padding:28px 18px; text-align:center; }
    span { display:grid; width:44px; height:44px; place-items:center; border-radius:14px; background:var(--rd-completed); color:var(--rd-maroon); font-size:22px; }
    h2 { margin:0; color:var(--rd-ink); font:500 20px Fraunces, Georgia, serif; }
    p { max-width:320px; margin:0; color:var(--rd-muted); font-size:14px; line-height:1.5; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
}
