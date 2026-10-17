import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="login-page rd-page-padding">
        <section class="login-card rd-card">
          <p class="eyebrow">RitualDesk</p>
          <h1>Welcome back</h1>
          <p class="intro">Sign in to open your ritual space.</p>
          <form [formGroup]="form" (ngSubmit)="login()" novalidate>
            <label for="username">Username</label>
            <input
              id="username"
              formControlName="username"
              autocomplete="username"
              [attr.aria-invalid]="showUsernameError"
              aria-describedby="username-error"
            >
            @if (showUsernameError) {
              <p id="username-error" class="field-error" role="alert">
                Enter your username.
              </p>
            }

            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="showPasswordError"
              aria-describedby="password-error"
            >
            @if (showPasswordError) {
              <p id="password-error" class="field-error" role="alert">
                Enter your password.
              </p>
            }

            <button type="submit" [disabled]="isSaving()">
              {{ isSaving() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </section>
      </main>
    </ion-content>
  `,
  styles: [`
    .login-page { display: grid; min-height: 100%; place-items: center; }
    .login-card { width: 100%; max-width: 400px; padding: 24px; }
    .eyebrow { color: var(--rd-maroon); font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
    h1 { margin: 0; color: var(--rd-ink); font: 500 30px Fraunces, Georgia, serif; }
    .intro { color: var(--rd-muted); }
    form { display: grid; gap: 10px; }
    label { color: var(--rd-ink); font-weight: 600; }
    input { min-height: var(--rd-tap-target); padding: 0 12px; border: 1px solid var(--rd-border); border-radius: 10px; background: var(--rd-cream); color: var(--rd-ink); font: inherit; }
    input[aria-invalid="true"] { border-color: var(--rd-maroon); }
    button { min-height: var(--rd-tap-target); border: 0; border-radius: 12px; background: var(--rd-maroon); color: var(--rd-cream); font: inherit; font-weight: 700; }
    button:disabled { opacity: .65; }
    .field-error { margin: -4px 0 2px; color: var(--rd-maroon); font-size: 13px; }
  `],
  imports: [IonContent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  readonly isSaving = signal(false);

  get showUsernameError(): boolean {
    const control = this.form.controls.username;
    return control.invalid && control.touched;
  }

  get showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && control.touched;
  }

  async login(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.login(username.trim(), password);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      const toast = await this.toastController.create({
        message: this.auth.errorMessage(error),
        duration: 3500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isSaving.set(false);
    }
  }
}
