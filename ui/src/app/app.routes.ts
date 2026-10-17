import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page')
      .then((module) => module.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component')
      .then((module) => module.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page')
          .then((module) => module.DashboardPage),
      },
      {
        path: 'bookings/new',
        loadComponent: () => import('./features/bookings/booking-form.page')
          .then((module) => module.BookingFormPage),
        data: { mode: 'create' },
      },
      {
        path: 'bookings/:id/edit',
        loadComponent: () => import('./features/bookings/booking-form.page')
          .then((module) => module.BookingFormPage),
        data: { mode: 'edit' },
      },
      {
        path: 'bookings/:id',
        loadComponent: () => import('./features/bookings/booking-detail.page')
          .then((module) => module.BookingDetailPage),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/bookings/bookings.page')
          .then((module) => module.BookingsPage),
      },
      {
        path: 'settings/homams/new',
        loadComponent: () => import('./features/homams/homam-form.page')
          .then((module) => module.HomamFormPage),
      },
      {
        path: 'settings/rituals/new',
        loadComponent: () => import('./features/rituals/ritual-form.page')
          .then((module) => module.RitualFormPage),
      },
      {
        path: 'settings/rituals/:id/edit',
        loadComponent: () => import('./features/rituals/ritual-form.page')
          .then((module) => module.RitualFormPage),
      },
      {
        path: 'settings/rituals',
        loadComponent: () => import('./features/rituals/rituals.page')
          .then((module) => module.RitualsPage),
      },
      {
        path: 'settings/reminders',
        loadComponent: () => import('./features/reminders/reminders.page')
          .then((module) => module.RemindersPage),
      },
      {
        path: 'settings/homams/:id/edit',
        loadComponent: () => import('./features/homams/homam-form.page')
          .then((module) => module.HomamFormPage),
      },
      {
        path: 'settings/homams',
        loadComponent: () => import('./features/homams/homam-catalog.page')
          .then((module) => module.HomamCatalogPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.page')
          .then((module) => module.SettingsPage),
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/schedule/schedule.page')
          .then((module) => module.SchedulePage),
      },
      {
        path: 'devotees/new',
        loadComponent: () => import('./features/devotees/devotee-form.page')
          .then((module) => module.DevoteeFormPage),
      },
      {
        path: 'devotees/:id/edit',
        loadComponent: () => import('./features/devotees/devotee-form.page')
          .then((module) => module.DevoteeFormPage),
      },
      {
        path: 'devotees/:id',
        loadComponent: () => import('./features/devotees/devotee-detail.page')
          .then((module) => module.DevoteeDetailPage),
      },
      {
        path: 'devotees',
        loadComponent: () => import('./features/devotees/devotees.page')
          .then((module) => module.DevoteesPage),
      },
      {
        path: 'history',
        loadComponent: () => import('./features/history/history.page')
          .then((module) => module.HistoryPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
