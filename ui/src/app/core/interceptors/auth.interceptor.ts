import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.getToken()).pipe(
    switchMap((token) => {
      const authorizedRequest = token
        ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : request;

      return next(authorizedRequest).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }

          const clearSessionAndRedirect = async (): Promise<void> => {
            try {
              await auth.logout();
            } finally {
              await router.navigateByUrl('/login');
            }
          };

          return from(clearSessionAndRedirect()).pipe(
            switchMap(() => throwError(() => error)),
          );
        }),
      );
    }),
  );
};
