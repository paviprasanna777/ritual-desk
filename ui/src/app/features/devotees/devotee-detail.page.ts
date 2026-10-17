import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { DevoteeDetail } from '../../core/models';
import { DevoteeService } from '../../core/services/devotee.service';
import { BookingCardComponent } from '../../shared/components/booking-card/booking-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-devotee-detail-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="Devotees"
          [title]="devotee()?.name ?? 'Devotee details'"
          [actionLabel]="devotee() ? 'Edit' : ''"
          (action)="edit()"
        ></app-page-header>
        @if (isLoading()) {
          <article class="detail-skeleton rd-card" aria-label="Loading devotee details">
            @for (row of skeletonRows; track row) {
              <ion-skeleton-text animated></ion-skeleton-text>
            }
          </article>
        } @else if (loadFailed()) {
          <app-empty-state title="Devotee unavailable" message="This devotee could not be loaded."></app-empty-state>
        } @else if (devotee(); as person) {
          <section class="contact-card rd-card">
            <div class="avatar" aria-hidden="true">{{ initials(person.name) }}</div>
            <div class="contact-details">
              @if (person.phone) {
                <a [href]="'tel:' + person.phone">{{ person.phone }}</a>
              } @else {
                <span class="muted">No phone number</span>
              }
              @if (person.address) {
                <p>{{ person.address }}</p>
              }
              @if (person.notes) {
                <p>{{ person.notes }}</p>
              }
            </div>
            <div class="due-total">
              <span>Total due</span>
              <strong>{{ person.totalBalanceDue | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong>
            </div>
          </section>
          <h2>Bookings</h2>
          @if (person.bookings.length) {
            <section class="booking-list" aria-label="Devotee bookings">
              @for (booking of person.bookings; track booking.id) {
                <app-booking-card [booking]="booking" (selected)="openBooking($event)"></app-booking-card>
              }
            </section>
          } @else {
            <app-empty-state title="No bookings" message="This devotee has no bookings yet."></app-empty-state>
          }
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .contact-card { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:14px; padding:18px; }
    .avatar { display:grid; width:56px; height:56px; place-items:center; border-radius:50%; background:var(--rd-completed); color:var(--rd-maroon); font-size:18px; font-weight:700; }
    .contact-details { display:grid; gap:5px; min-width:0; color:var(--rd-ink); }
    .contact-details a { color:var(--rd-maroon); font-weight:600; }
    .contact-details p { margin:0; white-space:pre-wrap; }
    .muted,.due-total span { color:var(--rd-muted); font-size:13px; }
    .due-total { display:grid; gap:3px; grid-column:1 / -1; padding-top:10px; border-top:1px solid var(--rd-border); }
    .due-total strong { color:var(--rd-ink); font-size:19px; }
    h2 { margin:22px 0 12px; color:var(--rd-ink); font:500 22px Fraunces, Georgia, serif; }
    .booking-list { display:grid; gap:12px; }
    .detail-skeleton { display:grid; min-height:190px; align-content:center; gap:14px; padding:18px; }
    ion-skeleton-text { height:18px; }
    ion-skeleton-text:nth-child(1) { width:45%; }
    ion-skeleton-text:nth-child(2) { width:65%; }
    ion-skeleton-text:nth-child(3) { width:75%; }
    @media (min-width:600px) { .contact-card { grid-template-columns:auto 1fr auto; } .due-total { grid-column:auto; padding:0 0 0 16px; border-top:0; border-left:1px solid var(--rd-border); } }
  `],
  imports: [
    BookingCardComponent,
    CurrencyPipe,
    EmptyStateComponent,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevoteeDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly devoteesApi = inject(DevoteeService);
  private readonly toastController = inject(ToastController);

  readonly devotee = signal<DevoteeDetail | null>(null);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly skeletonRows = [0, 1, 2];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      void this.load(id);
    } else {
      this.loadFailed.set(true);
      this.isLoading.set(false);
    }
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => Array.from(part)[0]?.toLocaleUpperCase() ?? '')
      .join('');
  }

  edit(): void {
    const person = this.devotee();
    if (person) {
      void this.router.navigate(['/devotees', person.id, 'edit']);
    }
  }

  openBooking(id: number): void {
    void this.router.navigate(['/bookings', id]);
  }

  private async load(id: number): Promise<void> {
    try {
      this.devotee.set(await firstValueFrom(this.devoteesApi.get(id)));
    } catch (error) {
      this.loadFailed.set(true);
      await this.showError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async showError(error: unknown): Promise<void> {
    const toast = await this.toastController.create({
      message: error instanceof Error ? error.message : 'The request could not be completed.',
      duration: 3500,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
}
