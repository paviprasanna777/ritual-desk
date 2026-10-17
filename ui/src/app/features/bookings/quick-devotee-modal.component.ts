import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { DevoteeInput } from '../../core/models';

@Component({
  selector: 'app-quick-devotee-modal',
  standalone: true,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Add devotee</ion-title>
        <ion-buttons slot="end">
          <ion-button type="button" (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="rd-page-content">
      <form class="quick-form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <label for="quickName">Name <span aria-hidden="true">*</span></label>
        <input id="quickName" formControlName="name" autocomplete="name"
          [attr.aria-invalid]="nameError">
        @if (nameError) {
          <p class="field-error" role="alert">Enter a name.</p>
        }

        <label for="quickPhone">Phone</label>
        <input id="quickPhone" type="tel" inputmode="numeric" maxlength="10"
          autocomplete="tel" formControlName="phone" [attr.aria-invalid]="phoneError">
        @if (phoneError) {
          <p class="field-error" role="alert">Enter a 10-digit phone number.</p>
        }

        <button type="submit" [disabled]="form.invalid">Add devotee</button>
      </form>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background:var(--rd-cream); --color:var(--rd-ink); }
    .quick-form { display:grid; width:100%; box-sizing:border-box; gap:10px; padding:20px 16px; }
    label { min-width:0; margin-top:4px; color:var(--rd-ink); font-weight:600; }
    input { width:100%; min-width:0; box-sizing:border-box; min-height:48px; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    input[aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    .quick-form > button { min-height:48px; margin-top:8px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .quick-form > button:disabled { opacity:.6; }
  `],
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickDevoteeModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly modalController = inject(ModalController);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.pattern(/^\d{10}$/)],
  });

  get nameError(): boolean {
    const control = this.form.controls.name;
    return control.invalid && control.touched;
  }

  get phoneError(): boolean {
    const control = this.form.controls.phone;
    return control.invalid && control.touched;
  }

  dismiss(): void {
    void this.modalController.dismiss(undefined, 'cancel');
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const input: DevoteeInput = {
      name: value.name.trim(),
      phone: value.phone.trim() || null,
      address: null,
      notes: null,
    };
    void this.modalController.dismiss(input, 'confirm');
  }
}
