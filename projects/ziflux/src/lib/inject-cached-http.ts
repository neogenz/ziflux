import { inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { tap } from 'rxjs'
import type { DataCache } from './data-cache'
import type { CachedHttpClient } from './types'

/**
 * Creates an HTTP client that auto-populates a `DataCache` on GET responses.
 * Must be called in an injection context (field initializer of an `@Injectable()`).
 *
 * - `get()` — fetches and caches the response under the given key
 * - `post/put/patch/delete` — pass-through (mutations don't cache)
 */
export function injectCachedHttp<T>(cache: DataCache<T>): CachedHttpClient<T> {
  const http = inject(HttpClient)

  return {
    get(url, key, options) {
      return http.get<T>(url, options as Record<string, unknown>).pipe(
        tap(data => {
          cache.set(key, data)
        }),
      )
    },
    post(url, body, options) {
      return http.post<T>(url, body, options as Record<string, unknown>)
    },
    put(url, body, options) {
      return http.put<T>(url, body, options as Record<string, unknown>)
    },
    patch(url, body, options) {
      return http.patch<T>(url, body, options as Record<string, unknown>)
    },
    delete(url, options) {
      return http.delete<T>(url, options as Record<string, unknown>)
    },
  }
}
