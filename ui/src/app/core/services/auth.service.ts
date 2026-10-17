import { computed, inject, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { LoginResponse } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenKey = 'ritualdesk.authToken';
  private readonly nameKey = 'ritualdesk.userName';
  private readonly token = signal<string | null>(null);
  readonly displayName = signal('');
  private readonly ready = Promise.all([
    Preferences.get({ key: this.tokenKey }),
    Preferences.get({ key: this.nameKey }),
  ]).then(([token, name]) => {
    this.token.set(token.value);
    this.displayName.set(name.value ?? '');
  });

  readonly isLoggedIn = computed(() => this.token() !== null);

  async getToken(): Promise<string | null> {
    await this.ready;
    return this.token();
  }

  async login(username: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.api.post<LoginResponse>('/auth/login', { username, password }),
    );
    await Promise.all([
      Preferences.set({ key: this.tokenKey, value: result.token }),
      Preferences.set({ key: this.nameKey, value: result.user.name }),
    ]);
    this.token.set(result.token);
    this.displayName.set(result.user.name);
  }

  async logout(): Promise<void> {
    this.token.set(null);
    this.displayName.set('');
    await Promise.all([
      Preferences.remove({ key: this.tokenKey }),
      Preferences.remove({ key: this.nameKey }),
    ]);
  }

  errorMessage(error: unknown): string {
    return this.api.errorMessage(error);
  }
}
