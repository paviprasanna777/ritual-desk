import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonModal,
  IonSkeletonText,
  ToastController,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Reminder, ReminderInput } from '../../core/models';
import { ReminderNotificationService } from '../../core/services/reminder-notification.service';
import { ReminderService } from '../../core/services/reminder.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

function validDateTime(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return { invalidDateTime: true };
  }
  const [, year, month, day, hour, minute] = match;
  const parsed = new Date(value);
  return parsed.getFullYear() === Number(year)
    && parsed.getMonth() + 1 === Number(month)
    && parsed.getDate() === Number(day)
    && parsed.getHours() === Number(hour)
    && parsed.getMinutes() === Number(minute)
    ? null
    : { invalidDateTime: true };
}

@Component({
  selector: 'app-reminders-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="Settings"
          title="Reminders"
          actionLabel="+ Add reminder"
          (action)="openForm()"
        ></app-page-header>

        @if (isLoading()) {
          <section class="reminder-list" aria-label="Loading reminders">
            @for (row of skeletonRows; track row) {
              <article class="reminder-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state title="Reminders unavailable" message="Reminders could not be loaded. Please try again."></app-empty-state>
        } @else if (reminders().length) {
          <section class="reminder-list" aria-label="Reminders">
            @for (reminder of reminders(); track reminder.id) {
              <article class="reminder-card rd-card">
                <div class="reminder-info">
                  <strong>{{ reminder.title }}</strong>
                  <time [attr.datetime]="reminder.remindAt">{{ reminder.remindAt | date:'medium' }}</time>
                  @if (reminder.autoCreated) {
                    <small>Booking reminder · editing unavailable</small>
                  }
                  @if (isDone(reminder)) {
                    <span class="done-label">Done</span>
                  }
                </div>
                <div class="reminder-actions">
                  @if (!isDone(reminder)) {
                    <button type="button" (click)="markDone(reminder)">Mark done</button>
                  }
                  @if (!reminder.autoCreated) {
                    <button type="button" class="secondary" (click)="openForm(reminder)">Edit</button>
                    <button type="button" class="danger" (click)="deleteReminder(reminder)">Delete</button>
                  }
                </div>
              </article>
            }
          </section>
        } @else {
          <app-empty-state title="No reminders yet" message="Add a reminder to keep upcoming tasks in view."></app-empty-state>
        }
      </main>
    </ion-content>

    <ion-modal [isOpen]="isFormOpen()" (didDismiss)="closeForm()">
      <ng-template>
        <section class="form-sheet">
          <header>
            <h2>{{ editingId() === null ? 'Add reminder' : 'Edit reminder' }}</h2>
            <button type="button" class="close-button" (click)="closeForm()">Close</button>
          </header>
          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            <label for="reminder-title">Title <span aria-hidden="true">*</span></label>
            <input id="reminder-title" formControlName="title" [attr.aria-invalid]="showTitleError">
            @if (showTitleError) {
              <p class="field-error" role="alert">Enter a title.</p>
            }

            <label for="reminder-at">Date and time <span aria-hidden="true">*</span></label>
            <input id="reminder-at" type="datetime-local" formControlName="remindAt" [attr.aria-invalid]="showDateError">
            @if (showDateError) {
              <p class="field-error" role="alert">Choose a valid date and time.</p>
            }

            <footer>
              <button type="button" class="secondary" (click)="closeForm()">Cancel</button>
              <button type="submit" [disabled]="isSaving()">
                {{ isSaving() ? 'Saving…' : 'Save reminder' }}
              </button>
            </footer>
          </form>
        </section>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .reminder-list { display:grid; gap:12px; }
    .reminder-card { display:flex; min-height:80px; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:14px; }
    .reminder-info { display:grid; min-width:180px; gap:4px; color:var(--rd-ink); }
    .reminder-info time,.reminder-info small { color:var(--rd-muted); font-size:13px; }
    .done-label { color:#287a43; font-size:13px; font-weight:700; }
    .reminder-actions { display:flex; flex-wrap:wrap; gap:6px; }
    button { min-height:var(--rd-tap-target); padding:0 12px; border:0; border-radius:10px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    button.secondary { border:1px solid var(--rd-border); background:transparent; color:var(--rd-ink); }
    button.danger { border:1px solid var(--rd-border); background:transparent; color:var(--rd-maroon); }
    .reminder-skeleton { display:grid; gap:12px; padding:16px; }
    .reminder-skeleton ion-skeleton-text:first-child { width:55%; height:18px; }
    .reminder-skeleton ion-skeleton-text:last-child { width:75%; height:14px; }
    .form-sheet { padding:24px 18px; color:var(--rd-ink); }
    header,footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    h2 { margin:0 0 16px; font:500 23px Fraunces,Georgia,serif; }
    form { display:grid; gap:9px; }
    label { margin-top:5px; font-weight:600; }
    input { min-height:var(--rd-tap-target); padding:0 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    input[aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    footer { justify-content:flex-end; margin-top:12px; }
    button:disabled { opacity:.6; }
    @media (min-width:600px) { .form-sheet { max-width:540px; margin:0 auto; padding:32px; } }
  `],
  imports: [
    DatePipe,
    EmptyStateComponent,
    IonContent,
    IonModal,
    IonSkeletonText,
    PageHeaderComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemindersPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly reminderService = inject(ReminderService);
  private readonly notificationService = inject(ReminderNotificationService);
  private readonly toastController = inject(ToastController);

  readonly reminders = signal<Reminder[]>([]);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly isFormOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly skeletonRows = [0, 1, 2];
  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    remindAt: ['', [Validators.required, validDateTime]],
  });

  ngOnInit(): void {
    void this.loadReminders();
  }

  get showTitleError(): boolean {
    const control = this.form.controls.title;
    return control.invalid && control.touched;
  }

  get showDateError(): boolean {
    const control = this.form.controls.remindAt;
    return control.invalid && control.touched;
  }

  isDone(reminder: Reminder): boolean {
    return reminder.done === true || reminder.done === 1;
  }

  openForm(reminder?: Reminder): void {
    this.editingId.set(reminder?.id ?? null);
    this.form.reset({
      title: reminder?.title ?? '',
      remindAt: reminder?.remindAt.slice(0, 16) ?? '',
    });
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    const { title, remindAt } = this.form.getRawValue();
    const existing = this.reminders().find((reminder) => reminder.id === this.editingId());
    const input: ReminderInput = {
      title: title.trim(),
      remindAt: `${remindAt}:00`,
      bookingId: null,
      ritualId: null,
      done: existing?.done === true || existing?.done === 1,
    };
    try {
      const id = this.editingId();
      if (id === null) {
        await firstValueFrom(this.reminderService.create(input));
      } else {
        await firstValueFrom(this.reminderService.update(id, input));
      }
      this.closeForm();
      await this.reloadAfterMutation();
    } catch (error) {
      await this.showError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  async markDone(reminder: Reminder): Promise<void> {
    try {
      await firstValueFrom(this.reminderService.update(reminder.id, { done: true }));
      await this.reloadAfterMutation();
    } catch (error) {
      await this.showError(error);
    }
  }

  async deleteReminder(reminder: Reminder): Promise<void> {
    try {
      await firstValueFrom(this.reminderService.delete(reminder.id));
      await this.reloadAfterMutation();
    } catch (error) {
      await this.showError(error);
    }
  }

  private async loadReminders(): Promise<void> {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    try {
      const result = await firstValueFrom(this.reminderService.list());
      this.reminders.set([...result].sort((left, right) =>
        left.remindAt.localeCompare(right.remindAt),
      ));
    } catch (error) {
      this.loadFailed.set(true);
      await this.showError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async reloadAfterMutation(): Promise<void> {
    await this.loadReminders();
    try {
      await this.notificationService.sync();
    } catch (error) {
      await this.showError(error);
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
