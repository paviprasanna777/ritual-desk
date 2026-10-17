import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, menuOutline, settingsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header">
      <div class="heading-group">
        @if (showBack) {
          <button
            type="button"
            class="back-button"
            aria-label="Go back"
            title="Go back"
            (click)="goBack()"
          >
            <ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon>
          </button>
        }
        <div class="heading">
          @if (eyebrow) {
            <p class="eyebrow">{{ eyebrow }}</p>
          }
          <h1>{{ title }}</h1>
        </div>
      </div>
      @if (actionLabel) {
        <button type="button" (click)="action.emit()">
          @if (actionIcon) {
            <ion-icon [name]="actionIcon" aria-hidden="true"></ion-icon>
          }
          {{ actionLabel }}
        </button>
      }
      @if (secondaryActionLabel) {
        <button type="button" class="secondary-action" (click)="secondaryAction.emit()">
          {{ secondaryActionLabel }}
        </button>
      }
    </header>
  `,
  styles: [`
    .page-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; }
    .heading-group { display:flex; min-width:0; align-items:center; gap:4px; }
    .heading { min-width:0; }
    .eyebrow { margin:0 0 4px; color:var(--rd-maroon); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    h1 { margin:0; color:var(--rd-ink); font:500 28px Fraunces, Georgia, serif; }
    button { display:inline-flex; min-height:var(--rd-tap-target); align-items:center; justify-content:center; gap:7px; padding:0 14px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .back-button { width:48px; height:48px; flex:0 0 48px; margin-left:-8px; padding:0; border:0; border-radius:50%; background:color-mix(in srgb, var(--rd-maroon) 8%, var(--rd-cream)); color:var(--rd-maroon); transition:background-color 160ms ease, transform 160ms ease; }
    .back-button:hover { background:color-mix(in srgb, var(--rd-maroon) 14%, var(--rd-cream)); }
    .back-button:active { transform:scale(.94); }
    .back-button:focus-visible { outline:2px solid var(--rd-maroon); outline-offset:1px; }
    .back-button ion-icon { font-size:20px; }
    .secondary-action { border:1px solid var(--rd-border); background:transparent; color:var(--rd-ink); }
    ion-icon { font-size:19px; }
  `],
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  constructor() {
    addIcons({ arrowBackOutline, menuOutline, settingsOutline });
  }

  @Input() eyebrow = '';
  @Input({ required: true }) title = '';
  @Input() showBack = true;
  @Input() actionLabel = '';
  @Input() actionIcon = '';
  @Output() readonly action = new EventEmitter<void>();
  @Input() secondaryActionLabel = '';
  @Output() readonly secondaryAction = new EventEmitter<void>();

  goBack(): void {
    if ((this.router.lastSuccessfulNavigation()?.id ?? 1) > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/dashboard');
  }
}
