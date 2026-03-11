import { describe, it, expect, beforeEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { injectCachedHttp } from './inject-cached-http'
import { DataCache } from './data-cache'
import type { CachedHttpClient } from './types'

describe('injectCachedHttp', () => {
  let cache: DataCache<string>
  let http: CachedHttpClient<string>
  let httpTesting: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })

    cache = TestBed.runInInjectionContext(() => new DataCache<string>())
    http = TestBed.runInInjectionContext(() => injectCachedHttp(cache))
    httpTesting = TestBed.inject(HttpTestingController)
  })

  // --- GET (cached) ---

  it('GET fetches and populates cache', async () => {
    const promise = firstValueFrom(http.get('/api/items', ['items', 'list']))
    const req = httpTesting.expectOne('/api/items')
    req.flush('response-data')

    const result = await promise
    expect(result).toBe('response-data')
    expect(cache.get(['items', 'list'])?.data).toBe('response-data')
  })

  it('GET passes request options', async () => {
    const promise = firstValueFrom(
      http.get('/api/items', ['items'], {
        params: { status: 'active' },
        headers: { 'X-Custom': 'value' },
      }),
    )

    const req = httpTesting.expectOne(
      r => r.url === '/api/items' && r.params.get('status') === 'active',
    )
    expect(req.request.headers.get('X-Custom')).toBe('value')
    req.flush('data')

    await promise
  })

  it('GET does not cache on error', async () => {
    const promise = firstValueFrom(http.get('/api/items', ['items', 'list'])).catch(() => 'caught')
    const req = httpTesting.expectOne('/api/items')
    req.flush('error', { status: 500, statusText: 'Server Error' })

    await promise
    expect(cache.get(['items', 'list'])).toBeNull()
  })

  // --- POST (pass-through) ---

  it('POST does not populate cache', async () => {
    const promise = firstValueFrom(http.post('/api/items', { name: 'new' }))
    const req = httpTesting.expectOne('/api/items')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ name: 'new' })
    req.flush('created')

    await promise
    // No cache entry created
    expect(cache.get(['items'])).toBeNull()
  })

  // --- PUT (pass-through) ---

  it('PUT does not populate cache', async () => {
    const promise = firstValueFrom(http.put('/api/items/1', { name: 'updated' }))
    const req = httpTesting.expectOne('/api/items/1')
    expect(req.request.method).toBe('PUT')
    req.flush('updated')

    await promise
  })

  // --- PATCH (pass-through) ---

  it('PATCH does not populate cache', async () => {
    const promise = firstValueFrom(http.patch('/api/items/1', { name: 'patched' }))
    const req = httpTesting.expectOne('/api/items/1')
    expect(req.request.method).toBe('PATCH')
    req.flush('patched')

    await promise
  })

  // --- DELETE (pass-through) ---

  it('DELETE does not populate cache', async () => {
    const promise = firstValueFrom(http.delete('/api/items/1'))
    const req = httpTesting.expectOne('/api/items/1')
    expect(req.request.method).toBe('DELETE')
    req.flush(null)

    await promise
  })
})
