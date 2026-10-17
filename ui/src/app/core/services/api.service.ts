import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error';

interface ApiResponse<T> {
  data: T;
}

export type ApiQuery = Readonly<Record<string, string | number | boolean | undefined>>;

function camelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelCaseKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key.replace(/_([a-z])/g, (_match: string, letter: string) => letter.toUpperCase()),
        camelCaseKeys(entry),
      ]),
    );
  }
  return value;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  get<T>(path: string, query?: ApiQuery): Observable<T> {
    return this.unwrap(this.http.get<ApiResponse<T>>(
      `${this.baseUrl}${path}`,
      { params: this.toParams(query) },
    ));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.unwrap(this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.unwrap(this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body));
  }

  delete<T>(path: string): Observable<T> {
    return this.unwrap(this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`));
  }

  errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    return error instanceof Error ? error.message : 'The request could not be completed.';
  }

  private unwrap<T>(response: Observable<ApiResponse<T>>): Observable<T> {
    return response.pipe(
      map((envelope) => camelCaseKeys(envelope.data) as T),
      catchError((error: unknown) => throwError(() => this.mapError(error))),
    );
  }

  private toParams(query?: ApiQuery): HttpParams {
    return Object.entries(query ?? {}).reduce((params, [key, value]) => (
      value === undefined ? params : params.set(key, String(value))
    ), new HttpParams());
  }

  private mapError(error: unknown): ApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiError('UNKNOWN', this.errorMessage(error));
    }

    const payload = error.error as {
      error?: string | { code?: string; message?: string; details?: unknown };
      details?: unknown;
    } | null;
    const structuredError = typeof payload?.error === 'object' ? payload.error : undefined;
    const message = structuredError?.message
      ?? (typeof payload?.error === 'string' ? payload.error : undefined)
      ?? (error.status === 0
        ? `Unable to connect to the API at ${this.baseUrl}.`
        : 'The request could not be completed.');

    return new ApiError(
      structuredError?.code ?? String(error.status || 'HTTP_ERROR'),
      message,
      structuredError?.details ?? payload?.details,
    );
  }
}
