import type { ResourceStatus, Signal } from '@angular/core'
import type { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http'
import type { Observable } from 'rxjs'
import type { DataCache } from './data-cache'

// --- Cache ---

export interface CacheEntry<T> {
  data: T
  createdAt: number
}

export interface ZifluxConfig {
  staleTime: number // ms before fresh → stale (default: 30s)
  gcTime: number // ms before stale → evicted (default: 5min)
}

// --- cachedResource ---

/**
 * Returned by `cachedResource()`. Provides all the signals from Angular's `ResourceRef<T>`
 * plus SWR-specific signals: `isStale` and `isInitialLoading`.
 *
 * `value` is read-only — use `set()` / `update()` to write.
 */
export interface CachedResourceRef<T> {
  readonly value: Signal<T | undefined>
  readonly status: Signal<ResourceStatus>
  readonly error: Signal<unknown>
  readonly isLoading: Signal<boolean>
  readonly isStale: Signal<boolean>
  readonly isInitialLoading: Signal<boolean>
  hasValue(): boolean
  reload(): boolean
  destroy(): void
  set(value: T): void
  update(updater: (value: T | undefined) => T): void
}

export interface CachedResourceOptions<T, P extends object> {
  cache: DataCache<T>
  key: string[] | ((params: NoInfer<P>) => string[])
  params?: () => P | undefined
  loader: (context: { params: P; abortSignal: AbortSignal }) => Observable<T> | Promise<T>
  staleTime?: number
  gcTime?: number
}

// --- cachedMutation ---

export type CachedMutationStatus = 'idle' | 'pending' | 'success' | 'error'

export interface CachedMutationOptions<A = void, R = void, C = void> {
  mutationFn: (args: A) => Observable<R> | Promise<R>
  cache?: { invalidate(prefix: string[]): void }
  invalidateKeys?: (args: A, result: R) => string[][]
  onMutate?: (args: A) => C | Promise<C>
  onSuccess?: (result: R, args: A) => void
  onError?: (error: unknown, args: A, context: C | undefined) => void
}

export interface CachedMutationRef<A, R> {
  mutate(...args: A extends void ? [] : [args: A]): Promise<R | undefined>
  readonly status: Signal<CachedMutationStatus>
  readonly isPending: Signal<boolean>
  readonly error: Signal<unknown>
  readonly data: Signal<R | undefined>
  reset(): void
}

// --- injectCachedHttp ---

export interface CachedHttpRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>
  params?: HttpParams | Record<string, string | string[]>
  context?: HttpContext
  reportProgress?: boolean
  withCredentials?: boolean
}

export interface CachedHttpClient<T> {
  get(url: string, key: string[], options?: CachedHttpRequestOptions): Observable<T>
  post(url: string, body: unknown, options?: CachedHttpRequestOptions): Observable<T>
  put(url: string, body: unknown, options?: CachedHttpRequestOptions): Observable<T>
  patch(url: string, body: unknown, options?: CachedHttpRequestOptions): Observable<T>
  delete(url: string, options?: CachedHttpRequestOptions): Observable<T>
}
