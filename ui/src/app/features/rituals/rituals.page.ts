import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Ritual, RitualTypeKind } from '../../core/models';
import { RitualService } from '../../core/services/ritual.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const ritualTypes: RitualTypeKind[] = ['daily', 'weekly', 'monthly', 'festival', 'special'];

@Component({
  selector: 'app-rituals-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="Settings"
          title="Rituals"
          actionLabel="Add ritual"
          (action)="addRitual()"
        ></app-page-header>

        @if (isLoading()) {
          <section class="ritual-groups" aria-label="Loading rituals">
            @for (row of skeletonRows; track row) {
              <article class="ritual-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state title="Rituals unavailable" message="Rituals could not be loaded."></app-empty-state>
        } @else if (rituals().length) {
          <section class="ritual-groups" aria-label="Rituals grouped by type">
            @for (type of types; track type) {
              @if (grouped()[type].length) {
                <section class="type-group">
                  <h2>{{ type | titlecase }}</h2>
                  <div class="ritual-list">
                    @for (ritual of grouped()[type]; track ritual.id) {
                      <article class="ritual-card rd-card" [class.inactive]="!ritual.active">
                        <button type="button" class="ritual-main" (click)="edit(ritual.id)">
                          <strong>{{ ritual.title }}</strong>
                          <span>{{ scheduleDescription(ritual) }}</span>
                        </button>
                        <label class="active-toggle">
                          <span>{{ ritual.active ? 'Active' : 'Inactive' }}</span>
                          <input
                            type="checkbox"
                            [checked]="ritual.active === 1"
                            [disabled]="isToggling(ritual.id)"
                            [attr.aria-label]="(ritual.active ? 'Deactivate ' : 'Activate ') + ritual.title"
                            (change)="toggleActive(ritual, $event)"
                          >
                        </label>
                      </article>
                    }
                  </div>
                </section>
              }
            }
          </section>
        } @else {
          <app-empty-state
            title="No rituals yet"
            message="Add a ritual to include it in the calendar schedule."
          ></app-empty-state>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .ritual-groups { display:grid; gap:20px; }
    .type-group h2 { margin:0 0 10px; color:var(--rd-maroon); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
    .ritual-list { display:grid; gap:10px; }
    .ritual-card { display:flex; min-height:76px; align-items:center; gap:12px; padding:10px 14px; }
    .ritual-card.inactive { opacity:.72; }
    .ritual-main { display:grid; min-width:0; min-height:52px; flex:1; align-content:center; justify-items:start; gap:4px; border:0; background:transparent; color:var(--rd-ink); text-align:left; font:inherit; }
    .ritual-main strong { font-size:16px; }
    .ritual-main span { color:var(--rd-muted); font-size:13px; }
    .active-toggle { display:grid; min-height:48px; justify-items:center; align-content:center; gap:2px; color:var(--rd-muted); font-size:11px; }
    .active-toggle input { width:22px; height:22px; accent-color:var(--rd-maroon); }
    .ritual-skeleton { display:grid; min-height:90px; align-content:center; gap:12px; padding:16px; }
    ion-skeleton-text { height:15px; }
    ion-skeleton-text:first-child { width:45%; }
    ion-skeleton-text:nth-child(2) { width:65%; }
    ion-skeleton-text:last-child { width:85%; }
  `],
  imports: [EmptyStateComponent, IonContent, IonSkeletonText, PageHeaderComponent, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RitualsPage implements OnInit {
  private readonly ritualService = inject(RitualService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly toggling = signal<Set<number>>(new Set());

  readonly types = ritualTypes;
  readonly rituals = signal<Ritual[]>([]);
  readonly grouped = () => {
    const groups = Object.fromEntries(ritualTypes.map((type) => [type, [] as Ritual[]])) as Record<RitualTypeKind, Ritual[]>;
    for (const ritual of this.rituals()) {
      groups[ritual.type].push(ritual);
    }
    return groups;
  };
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly skeletonRows = [0, 1, 2];

  ngOnInit(): void {
    void this.load();
  }

  addRitual(): void {
    void this.router.navigateByUrl('/settings/rituals/new');
  }

  edit(id: number): void {
    void this.router.navigate(['/settings/rituals', id, 'edit']);
  }

  isToggling(id: number): boolean {
    return this.toggling().has(id);
  }

  scheduleDescription(ritual: Ritual): string {
    const time = ritual.time ? ` · ${ritual.time}` : '';
    switch (ritual.type) {
      case 'weekly':
        return `${this.weekdays(ritual.daysOfWeek)}${time}`;
      case 'monthly':
        return `Day ${ritual.dayOfMonth}${time}`;
      case 'festival':
      case 'special':
        return `${ritual.date}${time}`;
      default:
        return `Every day${time}`;
    }
  }

  async toggleActive(ritual: Ritual, event: Event): Promise<void> {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement)) return;
    const previous = ritual.active;
    const next = previous === 1 ? 0 : 1;
    this.setToggling(ritual.id, true);
    try {
      await firstValueFrom(this.ritualService.update(ritual.id, {
        title: ritual.title,
        type: ritual.type,
        time: ritual.time,
        daysOfWeek: ritual.daysOfWeek,
        dayOfMonth: ritual.dayOfMonth,
        date: ritual.date,
        notes: ritual.notes,
        active: next,
      }));
      this.rituals.update((items) => items.map((item) =>
        item.id === ritual.id ? { ...item, active: next } : item,
      ));
    } catch (error) {
      checkbox.checked = previous === 1;
      await this.showError(error);
    } finally {
      this.setToggling(ritual.id, false);
    }
  }

  private weekdays(value: string | null): string {
    if (!value) return 'No days selected';
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return value.split(',').map((day) => names[Number(day)]).filter(Boolean).join(', ');
  }

  private setToggling(id: number, value: boolean): void {
    this.toggling.update((items) => {
      const next = new Set(items);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private async load(): Promise<void> {
    try {
      this.rituals.set(await firstValueFrom(this.ritualService.list()));
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
