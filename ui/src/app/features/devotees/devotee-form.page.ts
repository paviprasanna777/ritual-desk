import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { DevoteeInput } from '../../core/models';
import { DevoteeService } from '../../core/services/devotee.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-devotee-form-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header eyebrow="Devotees" [title]="isEdit() ? 'Edit devotee' : 'Add devotee'"></app-page-header>
        @if (isLoading()) {
          <div class="skeleton-card rd-card" aria-label="Loading devotee">
            <div></div><div></div><div></div>
          </div>
        } @else if (loadFailed()) {
          <app-empty-state title="Devotee unavailable" message="This devotee could not be loaded."></app-empty-state>
        } @else {
          <form class="form-card rd-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
            <label for="name">Name <span aria-hidden="true">*</span></label>
            <input id="name" formControlName="name" autocomplete="name" [attr.aria-invalid]="hasFieldError('name')">
            @if (hasFieldError('name')) {
              <p class="field-error" role="alert">Enter a name.</p>
            }

            <label for="phone">Phone</label>
            <input id="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" formControlName="phone"
              [attr.aria-invalid]="showPhoneError">
            @if (showPhoneError) {
              <p class="field-error" role="alert">Enter a 10-digit phone number.</p>
            }

            <label for="address">Address</label>
            <textarea id="address" rows="3" autocomplete="street-address" formControlName="address"></textarea>

            <label for="notes">Notes</label>
            <textarea id="notes" rows="4" formControlName="notes"></textarea>

            <button type="submit" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Add devotee') }}
            </button>
          </form>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .form-card,.skeleton-card { display:grid; gap:10px; padding:18px; }
    .form-card label { margin-top:4px; color:var(--rd-ink); font-weight:600; }
    .form-card input,.form-card textarea { width:100%; min-height:48px; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .form-card textarea { resize:vertical; }
    .form-card [aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    .form-card button { min-height:48px; margin-top:8px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .form-card button:disabled { opacity:.65; }
    .skeleton-card { min-height:250px; align-content:start; }
    .skeleton-card div { height:18px; margin:8px 0; border-radius:8px; background:var(--rd-border); }
  `],
  imports: [EmptyStateComponent, IonContent, PageHeaderComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevoteeFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly devoteesApi = inject(DevoteeService);
  private readonly toastController = inject(ToastController);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.pattern(/^\d{10}$/)],
    address: [''],
    notes: [''],
  });
  readonly isEdit = signal(false);
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly devoteeId = signal<number | null>(null);

  get showPhoneError(): boolean {
    const control = this.form.controls.phone;
    return control.invalid && control.touched;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.devoteeId.set(id);
      this.isEdit.set(true);
      void this.load(id);
    }
  }

  hasFieldError(controlName: 'name'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    try {
      const values = this.form.getRawValue();
      const input: DevoteeInput = {
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        notes: values.notes.trim() || null,
      };
      const id = this.devoteeId();
      if (id === null) {
        await firstValueFrom(this.devoteesApi.create(input));
        await this.router.navigateByUrl('/devotees');
      } else {
        await firstValueFrom(this.devoteesApi.update(id, input));
        await this.router.navigate(['/devotees', id]);
      }
    } catch (error) {
      await this.showError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(id: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const devotee = await firstValueFrom(this.devoteesApi.get(id));
      this.form.patchValue({
        name: devotee.name,
        phone: devotee.phone ?? '',
        address: devotee.address ?? '',
        notes: devotee.notes ?? '',
      });
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
