import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Ritual, RitualInput, RitualTypeKind } from '../../core/models';
import { RitualService } from '../../core/services/ritual.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const weekdays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

@Component({
  selector: 'app-ritual-form-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header eyebrow="Rituals" [title]="isEdit() ? 'Edit ritual' : 'Add ritual'"></app-page-header>
        @if (isLoading()) {
          <article class="form-skeleton rd-card" aria-label="Loading ritual">
            <div></div><div></div><div></div>
          </article>
        } @else if (loadFailed()) {
          <app-empty-state title="Ritual unavailable" message="This ritual could not be loaded."></app-empty-state>
        } @else {
          <form class="form-card rd-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
            <label for="title">Title <span aria-hidden="true">*</span></label>
            <input id="title" formControlName="title" [attr.aria-invalid]="hasTitleError">
            @if (hasTitleError) {
              <p class="field-error" role="alert">Enter a ritual title.</p>
            }

            <label for="type">Type <span aria-hidden="true">*</span></label>
            <select id="type" formControlName="type" (change)="onTypeChange()">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="festival">Festival</option>
              <option value="special">Special</option>
            </select>

            <label for="time">Time</label>
            <input id="time" type="time" formControlName="time">

            @if (form.controls.type.value === 'weekly') {
              <fieldset>
                <legend>Days of week <span aria-hidden="true">*</span></legend>
                <div class="weekday-options">
                  @for (weekday of weekdays; track weekday.value) {
                    <label class="weekday-option">
                      <input
                        type="checkbox"
                        [checked]="isWeekdaySelected(weekday.value)"
                        (change)="toggleWeekday(weekday.value, $event)"
                      >
                      <span>{{ weekday.label }}</span>
                    </label>
                  }
                </div>
                @if (showScheduleError && selectedWeekdays().length === 0) {
                  <p class="field-error" role="alert">Select at least one day.</p>
                }
              </fieldset>
            }

            @if (form.controls.type.value === 'monthly') {
              <label for="dayOfMonth">Day of month <span aria-hidden="true">*</span></label>
              <input id="dayOfMonth" type="number" min="1" max="31" step="1"
                formControlName="dayOfMonth" [attr.aria-invalid]="showDayError">
              @if (showDayError) {
                <p class="field-error" role="alert">Enter a day from 1 to 31.</p>
              }
            }

            @if (form.controls.type.value === 'festival' || form.controls.type.value === 'special') {
              <label for="date">Date <span aria-hidden="true">*</span></label>
              <input id="date" type="date" formControlName="date" [attr.aria-invalid]="showDateError">
              @if (showDateError) {
                <p class="field-error" role="alert">Choose a valid date.</p>
              }
            }

            <label for="notes">Notes</label>
            <textarea id="notes" rows="4" formControlName="notes"></textarea>

            <button type="submit" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Add ritual') }}
            </button>
          </form>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .form-card,.form-skeleton { display:grid; gap:10px; padding:18px; }
    .form-card > label,legend { margin-top:4px; color:var(--rd-ink); font-weight:600; }
    .form-card > input,.form-card select,.form-card textarea { width:100%; min-height:48px; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .form-card textarea { resize:vertical; }
    [aria-invalid="true"] { border-color:var(--rd-maroon)!important; }
    fieldset { display:grid; gap:10px; margin:4px 0; padding:12px; border:1px solid var(--rd-border); border-radius:12px; }
    fieldset legend { padding:0 4px; }
    .weekday-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px 10px; }
    .weekday-option { display:flex; min-height:48px; align-items:center; gap:8px; color:var(--rd-ink); }
    .weekday-option input { width:20px; height:20px; accent-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    .form-card > button { min-height:48px; margin-top:8px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .form-card > button:disabled { opacity:.65; }
    .form-skeleton { min-height:250px; align-content:start; }
    .form-skeleton div { height:18px; margin:8px 0; border-radius:8px; background:var(--rd-border); }
    @media (min-width:540px) { .weekday-options { grid-template-columns:repeat(4,minmax(0,1fr)); } }
  `],
  imports: [EmptyStateComponent, IonContent, PageHeaderComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RitualFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ritualService = inject(RitualService);
  private readonly toastController = inject(ToastController);

  readonly weekdays = weekdays;
  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    type: ['daily' as RitualTypeKind, Validators.required],
    time: [''],
    dayOfMonth: [null as number | null],
    date: [''],
    notes: [''],
  });
  readonly selectedWeekdays = signal<number[]>([]);
  readonly isEdit = signal(false);
  readonly ritualId = signal<number | null>(null);
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly submitted = signal(false);

  get hasTitleError(): boolean {
    const title = this.form.controls.title;
    return title.invalid && title.touched;
  }

  get showScheduleError(): boolean {
    return this.submitted();
  }

  get showDayError(): boolean {
    const day = this.form.controls.dayOfMonth.value;
    return this.submitted()
      && (!Number.isInteger(day) || day === null || day < 1 || day > 31);
  }

  get showDateError(): boolean {
    return this.submitted() && !isValidDate(this.form.controls.date.value);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.ritualId.set(id);
      this.isEdit.set(true);
      void this.load(id);
    }
  }

  onTypeChange(): void {
    this.form.controls.dayOfMonth.setValue(null);
    this.form.controls.date.setValue('');
    this.selectedWeekdays.set([]);
  }

  isWeekdaySelected(day: number): boolean {
    return this.selectedWeekdays().includes(day);
  }

  toggleWeekday(day: number, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.selectedWeekdays.update((days) => {
      const next = target.checked
        ? [...days, day]
        : days.filter((item) => item !== day);
      return next.sort((left, right) => left - right);
    });
  }

  async save(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.validSchedule() || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      const values = this.form.getRawValue();
      const type = values.type;
      const ritual: RitualInput = {
        title: values.title.trim(),
        type,
        time: values.time || null,
        daysOfWeek: type === 'weekly' ? this.selectedWeekdays().join(',') : null,
        dayOfMonth: type === 'monthly' ? values.dayOfMonth : null,
        date: type === 'festival' || type === 'special' ? values.date : null,
        notes: values.notes.trim() || null,
      };
      const id = this.ritualId();
      if (id === null) {
        await firstValueFrom(this.ritualService.create(ritual));
      } else {
        await firstValueFrom(this.ritualService.update(id, ritual));
      }
      await this.router.navigateByUrl('/settings/rituals');
    } catch (error) {
      await this.showError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  private validSchedule(): boolean {
    const type = this.form.controls.type.value;
    if (type === 'weekly') return this.selectedWeekdays().length > 0;
    if (type === 'monthly') {
      const day = this.form.controls.dayOfMonth.value;
      return Number.isInteger(day) && day !== null && day >= 1 && day <= 31;
    }
    if (type === 'festival' || type === 'special') {
      return isValidDate(this.form.controls.date.value);
    }
    return true;
  }

  private async load(id: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const ritual: Ritual = await firstValueFrom(this.ritualService.get(id));
      this.form.patchValue({
        title: ritual.title,
        type: ritual.type,
        time: ritual.time ?? '',
        dayOfMonth: ritual.dayOfMonth,
        date: ritual.date ?? '',
        notes: ritual.notes ?? '',
      });
      if (ritual.type === 'weekly' && ritual.daysOfWeek) {
        this.selectedWeekdays.set(ritual.daysOfWeek.split(',').map(Number));
      }
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
