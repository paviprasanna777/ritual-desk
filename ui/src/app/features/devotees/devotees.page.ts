import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  tap,
  firstValueFrom,
} from 'rxjs';
import { Devotee, DevoteeDetail } from '../../core/models';
import { DevoteeService } from '../../core/services/devotee.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface DevoteeListItem {
  devotee: Devotee;
  bookingCount: number;
  totalBalanceDue: number;
}

@Component({
  selector: 'app-devotees-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="RitualDesk"
          title="Devotees"
          actionLabel="Add devotee"
          (action)="addDevotee()"
        ></app-page-header>
        <label class="search-label" for="devoteeSearch">Search by name or phone</label>
        <input
          id="devoteeSearch"
          class="search-input rd-card"
          type="search"
          [formControl]="search"
          autocomplete="off"
          aria-label="Search devotees by name or phone"
        >
        @if (isLoading()) {
          <section class="devotee-list" aria-label="Loading devotees">
            @for (row of skeletonRows; track row) {
              <article class="devotee-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state title="Devotees unavailable" message="The devotee list could not be loaded."></app-empty-state>
        } @else if (items().length) {
          <section class="devotee-list" aria-label="Devotees">
            @for (item of items(); track item.devotee.id) {
              <article class="devotee-row rd-card">
                <button class="devotee-main" type="button" (click)="open(item.devotee.id)">
                  <span class="avatar" aria-hidden="true">{{ initials(item.devotee.name) }}</span>
                  <span class="identity">
                    <strong>{{ item.devotee.name }}</strong>
                    @if (item.devotee.phone) {
                      <small>{{ item.devotee.phone }}</small>
                    }
                    <small>{{ item.bookingCount }} {{ item.bookingCount === 1 ? 'booking' : 'bookings' }}</small>
                  </span>
                </button>
                @if (item.totalBalanceDue > 0) {
                  <span class="due-chip">
                    Due {{ item.totalBalanceDue | currency:'INR':'symbol':'1.0-0':'en-IN' }}
                  </span>
                }
                <button class="delete-button" type="button" (click)="confirmDelete(item.devotee)">
                  Delete
                </button>
              </article>
            }
          </section>
        } @else {
          <app-empty-state
            [title]="search.value.trim() ? 'No matching devotees' : 'No devotees yet'"
            [message]="search.value.trim() ? 'Try a different name or phone number.' : 'Add a devotee to keep their contact details and bookings together.'"
          ></app-empty-state>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .search-label { display:block; margin:0 0 7px; color:var(--rd-ink); font-size:14px; font-weight:600; }
    .search-input { width:100%; min-height:48px; margin-bottom:16px; padding:0 14px; border:1px solid var(--rd-border); border-radius:12px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .devotee-list { display:grid; gap:10px; }
    .devotee-skeleton { display:grid; min-height:80px; align-content:center; gap:12px; padding:14px; }
    ion-skeleton-text { height:16px; }
    ion-skeleton-text:first-child { width:60%; }
    ion-skeleton-text:last-child { width:38%; }
    .devotee-row { display:flex; min-height:76px; align-items:center; gap:10px; padding:10px; }
    .devotee-main { display:flex; min-width:0; min-height:52px; flex:1; align-items:center; gap:12px; border:0; background:transparent; color:var(--rd-ink); text-align:left; font:inherit; }
    .avatar { display:grid; width:48px; height:48px; flex:0 0 48px; place-items:center; border-radius:50%; background:var(--rd-completed); color:var(--rd-maroon); font-weight:700; }
    .identity { display:grid; min-width:0; gap:3px; }
    .identity strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .identity small { color:var(--rd-muted); font-size:12px; }
    .due-chip { flex:0 0 auto; padding:7px 10px; border-radius:999px; background:var(--rd-scheduled); color:var(--rd-ink); font-size:12px; font-weight:700; }
    .delete-button { min-height:48px; padding:0 10px; border:0; border-radius:10px; background:transparent; color:var(--rd-maroon); font:inherit; }
    @media (max-width:480px) { .devotee-row { flex-wrap:wrap; } .devotee-main { flex-basis:calc(100% - 10px); } .due-chip { margin-left:60px; } }
  `],
  imports: [CurrencyPipe, EmptyStateComponent, IonContent, IonSkeletonText, PageHeaderComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevoteesPage implements OnInit {
  private readonly devoteesApi = inject(DevoteeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly search = new FormControl('', { nonNullable: true });
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly items = signal<DevoteeListItem[]>([]);
  readonly skeletonRows = [0, 1, 2];

  ngOnInit(): void {
    this.search.valueChanges.pipe(
      startWith(this.search.value),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading.set(true);
        this.loadFailed.set(false);
      }),
      switchMap((term) => this.loadItems(term)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((items) => {
      this.items.set(items);
      this.isLoading.set(false);
    });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => Array.from(part)[0]?.toLocaleUpperCase() ?? '')
      .join('');
  }

  addDevotee(): void {
    void this.router.navigateByUrl('/devotees/new');
  }

  open(id: number): void {
    void this.router.navigate(['/devotees', id]);
  }

  async confirmDelete(devotee: Devotee): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Delete devotee?',
      message: `Delete ${devotee.name}? A devotee with bookings cannot be deleted.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }

    try {
      await firstValueFrom(this.devoteesApi.delete(devotee.id));
      this.items.update((current) => current.filter((item) => item.devotee.id !== devotee.id));
    } catch (error) {
      await this.showError(error);
    }
  }

  private loadItems(term: string) {
    return this.devoteesApi.list(term.trim()).pipe(
      switchMap((devotees) => {
        if (!devotees.length) {
          return of([]);
        }
        return forkJoin(devotees.map((devotee) => this.devoteesApi.get(devotee.id))).pipe(
          map((details: DevoteeDetail[]) => details
            .map((detail) => ({
              devotee: detail,
              bookingCount: detail.bookings.length,
              totalBalanceDue: detail.totalBalanceDue,
            }))
            .sort((left, right) => left.devotee.name.localeCompare(right.devotee.name))),
        );
      }),
      catchError((error: unknown) => {
        this.loadFailed.set(true);
        void this.showError(error);
        return of([]);
      }),
    );
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
