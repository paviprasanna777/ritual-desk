import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { HomamType } from '../../core/models';
import { HomamService } from '../../core/services/homam.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-homam-catalog-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="Settings"
          title="Homam catalog"
          actionLabel="Add homam"
          (action)="navigateToForm()"
        ></app-page-header>
        @if (isLoading()) {
          <section class="catalog-list" aria-label="Loading homam catalog">
            @for (row of skeletonRows; track row) {
              <article class="catalog-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state
            title="Catalog unavailable"
            message="The homam catalog could not be loaded."
          ></app-empty-state>
        } @else if (homams().length) {
          <section class="catalog-list" aria-label="Homam catalog">
            @for (homam of homams(); track homam.id) {
              <article class="homam-card rd-card">
                <button class="homam-main" type="button" (click)="edit(homam.id)">
                  <strong>{{ homam.name }}</strong>
                  <span>{{ homam.defaultAmount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</span>
                </button>
                <div class="homam-actions">
                  <button type="button" (click)="edit(homam.id)">Edit</button>
                  <button type="button" class="delete" (click)="confirmDelete(homam)">Delete</button>
                </div>
              </article>
            }
          </section>
        } @else {
          <app-empty-state
            title="No homams in the catalog"
            message="Add a homam to make it available when creating bookings."
          ></app-empty-state>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .catalog-list { display:grid; gap:12px; }
    .catalog-skeleton { display:grid; min-height:86px; align-content:center; gap:12px; padding:16px; }
    ion-skeleton-text { height:16px; }
    ion-skeleton-text:first-child { width:55%; }
    ion-skeleton-text:last-child { width:35%; }
    .homam-card { display:flex; min-height:78px; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; }
    .homam-main { display:grid; min-height:48px; flex:1; align-content:center; justify-items:start; gap:5px; border:0; background:transparent; color:var(--rd-ink); text-align:left; font:inherit; }
    .homam-main strong { font-size:16px; }
    .homam-main span { color:var(--rd-muted); font-size:14px; }
    .homam-actions { display:flex; gap:8px; }
    .homam-actions button { min-height:48px; padding:0 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .homam-actions .delete { color:var(--rd-maroon); }
  `],
  imports: [CurrencyPipe, EmptyStateComponent, IonContent, IonSkeletonText, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomamCatalogPage {
  private readonly homamService = inject(HomamService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly homams = signal<HomamType[]>([]);
  readonly skeletonRows = [0, 1, 2];

  ionViewWillEnter(): void {
    void this.load();
  }

  navigateToForm(): void {
    void this.router.navigateByUrl('/settings/homams/new');
  }

  edit(id: number): void {
    void this.router.navigate(['/settings/homams', id, 'edit']);
  }

  async confirmDelete(homam: HomamType): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Delete homam?',
      message: `${homam.name} will be removed from the active catalog.`,
      buttons: [
        { text: 'Keep homam', role: 'cancel' },
        { text: 'Delete', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }

    try {
      await firstValueFrom(this.homamService.delete(homam.id));
      this.homams.update((current) => current.filter((item) => item.id !== homam.id));
    } catch (error) {
      await this.showError(error);
    }
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    try {
      this.homams.set(await firstValueFrom(this.homamService.list()));
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
