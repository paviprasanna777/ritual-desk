import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { HomamTypeInput } from '../../core/models';
import { HomamService } from '../../core/services/homam.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-homam-form-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header eyebrow="Homam catalog" [title]="isEdit() ? 'Edit homam' : 'Add homam'"></app-page-header>
        @if (isLoading()) {
          <div class="form-skeleton rd-card" aria-label="Loading homam">
            <div></div><div></div><div></div>
          </div>
        } @else if (loadFailed()) {
          <app-empty-state title="Homam unavailable" message="This homam could not be loaded."></app-empty-state>
        } @else {
          <form class="form-card rd-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
            <label for="name">Name <span aria-hidden="true">*</span></label>
            <input id="name" formControlName="name" [attr.aria-invalid]="hasFieldError('name')">
            @if (hasFieldError('name')) {
              <p class="field-error" role="alert">Enter a homam name.</p>
            }

            <label for="defaultAmount">Default amount (₹) <span aria-hidden="true">*</span></label>
            <input id="defaultAmount" type="number" min="0" step="1" formControlName="defaultAmount"
              [attr.aria-invalid]="hasFieldError('defaultAmount')">
            @if (hasFieldError('defaultAmount')) {
              <p class="field-error" role="alert">Enter a non-negative whole-rupee amount.</p>
            }

            <label for="durationMins">Duration (minutes)</label>
            <input id="durationMins" type="number" min="1" step="1" formControlName="durationMins">

            <label for="itemEntry">Items needed</label>
            <div class="chip-entry">
              <input id="itemEntry" [value]="itemEntry()" (input)="setItemEntry($event)"
                (keydown)="onItemKeydown($event)" aria-label="Add an item needed">
              <button type="button" (click)="addItem()">Add item</button>
            </div>
            @if (itemsNeeded.length) {
              <ul class="chips" aria-label="Items needed">
                @for (item of itemsNeeded.controls; track $index; let index = $index) {
                  <li>
                    <span>{{ item.value }}</span>
                    <button type="button" [attr.aria-label]="'Remove ' + item.value" (click)="removeItem(index)">×</button>
                  </li>
                }
              </ul>
            }

            <label for="notes">Notes</label>
            <textarea id="notes" rows="4" formControlName="notes"></textarea>

            <button class="submit" type="submit" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Add homam') }}
            </button>
          </form>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .form-card,.form-skeleton { display:grid; gap:10px; padding:18px; }
    .form-card label { margin-top:4px; color:var(--rd-ink); font-weight:600; }
    .form-card input,.form-card textarea { width:100%; min-height:48px; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .form-card textarea { resize:vertical; }
    .form-card [aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    .chip-entry { display:flex; gap:8px; }
    .chip-entry input { flex:1; min-width:0; }
    .chip-entry button,.chips button { min-height:48px; padding:0 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; list-style:none; }
    .chips li { display:flex; min-height:48px; align-items:center; gap:5px; padding:0 5px 0 12px; border-radius:999px; background:var(--rd-completed); color:var(--rd-ink); }
    .chips button { width:40px; min-height:40px; padding:0; border:0; border-radius:50%; font-size:20px; }
    .submit { min-height:48px; margin-top:8px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .submit:disabled { opacity:.65; }
    .form-skeleton { min-height:260px; align-content:start; }
    .form-skeleton div { height:18px; margin:8px 0; border-radius:8px; background:var(--rd-border); }
  `],
  imports: [EmptyStateComponent, IonContent, PageHeaderComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomamFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly homamService = inject(HomamService);
  private readonly toastController = inject(ToastController);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    defaultAmount: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    durationMins: [null as number | null, [Validators.min(1), Validators.pattern(/^\d+$/)]],
    itemsNeeded: this.formBuilder.nonNullable.array<string>([]),
    notes: [''],
  });
  readonly isEdit = signal(false);
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly itemEntry = signal('');
  readonly homamId = signal<number | null>(null);
  readonly itemsNeeded: FormArray = this.form.controls.itemsNeeded;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.homamId.set(id);
      this.isEdit.set(true);
      void this.load(id);
    }
  }

  hasFieldError(controlName: 'name' | 'defaultAmount'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  setItemEntry(event: Event): void {
    this.itemEntry.set((event.target as HTMLInputElement).value);
  }

  onItemKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addItem();
    }
  }

  addItem(): void {
    const values = this.itemEntry().split(',').map((item) => item.trim()).filter(Boolean);
    for (const item of values) {
      if (!this.itemsNeeded.controls.some((control) => control.value === item)) {
        this.itemsNeeded.push(this.formBuilder.nonNullable.control(item));
      }
    }
    this.itemEntry.set('');
  }

  removeItem(index: number): void {
    this.itemsNeeded.removeAt(index);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const input: HomamTypeInput = {
        name: value.name.trim(),
        defaultAmount: value.defaultAmount,
        durationMins: value.durationMins,
        itemsNeeded: value.itemsNeeded,
        notes: value.notes.trim() || null,
      };
      const id = this.homamId();
      if (id === null) {
        await firstValueFrom(this.homamService.create(input));
      } else {
        await firstValueFrom(this.homamService.update(id, input));
      }
      const toast = await this.toastController.create({
        message: 'Homam saved',
        duration: 2500,
        position: 'top',
        color: 'success',
      });
      await toast.present();
      await this.router.navigateByUrl('/settings/homams');
    } catch (error) {
      await this.showError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(id: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const homam = (await firstValueFrom(this.homamService.list(true)))
        .find((item) => item.id === id);
      if (!homam) {
        throw new Error('Homam not found.');
      }
      this.form.patchValue({
        name: homam.name,
        defaultAmount: homam.defaultAmount,
        durationMins: homam.durationMins,
        notes: homam.notes ?? '',
      });
      for (const item of homam.itemsNeeded) {
        this.itemsNeeded.push(this.formBuilder.nonNullable.control(item));
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
