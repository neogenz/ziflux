import { signal } from '@angular/core'
import { describe, it, expect, vi } from 'vitest'
import { of, throwError } from 'rxjs'
import { cachedMutation } from './cached-mutation'
import type { CachedMutationRef } from './types'

describe('cachedMutation', () => {
  // --- Status lifecycle ---

  it('transitions idle → pending → success', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve('ok'),
    })

    expect(mutation.status()).toBe('idle')

    const promise = mutation.mutate()
    expect(mutation.status()).toBe('pending')

    await promise
    expect(mutation.status()).toBe('success')
  })

  it('transitions idle → pending → error', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.reject(new Error('fail')),
    })

    expect(mutation.status()).toBe('idle')

    const promise = mutation.mutate()
    expect(mutation.status()).toBe('pending')

    await promise
    expect(mutation.status()).toBe('error')
  })

  // --- isPending ---

  it('isPending is true during mutation, false after', async () => {
    let resolve!: (v: string) => void
    const mutation = cachedMutation({
      mutationFn: () => new Promise<string>(r => (resolve = r)),
    })

    expect(mutation.isPending()).toBe(false)

    const promise = mutation.mutate()
    expect(mutation.isPending()).toBe(true)

    resolve('done')
    await promise
    expect(mutation.isPending()).toBe(false)
  })

  // --- error signal ---

  it('error is null on success, set on error', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.reject(new Error('boom')),
    })

    expect(mutation.error()).toBeNull()

    await mutation.mutate()
    expect(mutation.error()).toBeInstanceOf(Error)
    expect((mutation.error() as Error).message).toBe('boom')
  })

  it('error is cleared on next mutate call', async () => {
    let shouldFail = true
    const mutation = cachedMutation({
      mutationFn: () => (shouldFail ? Promise.reject(new Error('fail')) : Promise.resolve('ok')),
    })

    await mutation.mutate()
    expect(mutation.error()).toBeInstanceOf(Error)

    shouldFail = false
    await mutation.mutate()
    expect(mutation.error()).toBeNull()
  })

  // --- data signal ---

  it('data is undefined initially, set on success', async () => {
    const mutation = cachedMutation({
      mutationFn: (n: number) => Promise.resolve(n * 2),
    })

    expect(mutation.data()).toBeUndefined()

    await mutation.mutate(5)
    expect(mutation.data()).toBe(10)
  })

  it('data is kept on error (last successful result)', async () => {
    let shouldFail = false
    const mutation = cachedMutation({
      mutationFn: () => (shouldFail ? Promise.reject(new Error('fail')) : Promise.resolve('good')),
    })

    await mutation.mutate()
    expect(mutation.data()).toBe('good')

    shouldFail = true
    await mutation.mutate()
    expect(mutation.data()).toBe('good')
    expect(mutation.status()).toBe('error')
  })

  // --- Cache invalidation ---

  it('invalidates cache keys on success', async () => {
    const cache = { invalidate: vi.fn() }

    const mutation = cachedMutation({
      mutationFn: (id: string) => Promise.resolve(id),
      cache,
      invalidateKeys: id => [
        ['item', 'details', id],
        ['item', 'list'],
      ],
    })

    await mutation.mutate('42')
    expect(cache.invalidate).toHaveBeenCalledTimes(2)
    expect(cache.invalidate).toHaveBeenCalledWith(['item', 'details', '42'])
    expect(cache.invalidate).toHaveBeenCalledWith(['item', 'list'])
  })

  it('does not invalidate cache on error', async () => {
    const cache = { invalidate: vi.fn() }

    const mutation = cachedMutation({
      mutationFn: () => Promise.reject(new Error('fail')),
      cache,
      invalidateKeys: () => [['item', 'list']],
    })

    await mutation.mutate()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })

  // --- invalidateKeys receives args and result ---

  it('invalidateKeys receives both args and result', async () => {
    const cache = { invalidate: vi.fn() }
    const invalidateKeys = vi.fn().mockReturnValue([['items']])

    const mutation = cachedMutation({
      mutationFn: (id: string) => Promise.resolve({ id, name: 'created' }),
      cache,
      invalidateKeys,
    })

    await mutation.mutate('99')
    expect(invalidateKeys).toHaveBeenCalledWith('99', { id: '99', name: 'created' })
  })

  // --- Lifecycle callbacks ---

  it('onMutate is called before mutationFn', async () => {
    const order: string[] = []

    const mutation = cachedMutation({
      mutationFn: () => {
        order.push('mutationFn')
        return Promise.resolve()
      },
      onMutate: () => {
        order.push('onMutate')
      },
    })

    await mutation.mutate()
    expect(order).toEqual(['onMutate', 'mutationFn'])
  })

  it('onMutate supports async', async () => {
    const onMutate = vi.fn().mockResolvedValue('context')

    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve(),
      onMutate,
    })

    await mutation.mutate()
    expect(onMutate).toHaveBeenCalled()
  })

  it('onSuccess is called after cache invalidation', async () => {
    const order: string[] = []
    const cache = {
      invalidate: () => {
        order.push('invalidate')
      },
    }

    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve('result'),
      cache,
      invalidateKeys: () => [['key']],
      onSuccess: () => {
        order.push('onSuccess')
      },
    })

    await mutation.mutate()
    expect(order).toEqual(['invalidate', 'onSuccess'])
  })

  it('onError is called with context from onMutate', async () => {
    const onError = vi.fn()

    const mutation = cachedMutation<string, undefined, string[]>({
      mutationFn: () => Promise.reject(new Error('fail')),
      onMutate: () => ['rollback-data'],
      onError,
    })

    await mutation.mutate('args')
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'args', ['rollback-data'])
  })

  // --- Optimistic update + rollback ---

  it('supports optimistic update with rollback', async () => {
    const items = signal(['a', 'b', 'c'])

    const mutation = cachedMutation<string, undefined, string[]>({
      mutationFn: () => Promise.reject(new Error('fail')),
      onMutate: id => {
        const prev = items()
        items.set(prev.filter(i => i !== id))
        return prev
      },
      onError: (_err, _args, context) => {
        if (context) items.set(context)
      },
    })

    await mutation.mutate('b')
    // Should have rolled back
    expect(items()).toEqual(['a', 'b', 'c'])
  })

  // --- Void args ---

  it('works with void args (no-arg mutation)', async () => {
    const mutation: CachedMutationRef<void, string> = cachedMutation({
      mutationFn: () => Promise.resolve('done'),
    })

    const result = await mutation.mutate()
    expect(result).toBe('done')
  })

  // --- Observable support ---

  it('handles Observable mutationFn', async () => {
    const mutation = cachedMutation({
      mutationFn: () => of('from-observable'),
    })

    const result = await mutation.mutate()
    expect(result).toBe('from-observable')
  })

  // --- Promise support ---

  it('handles Promise mutationFn', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve('from-promise'),
    })

    const result = await mutation.mutate()
    expect(result).toBe('from-promise')
  })

  // --- reset ---

  it('reset() clears status, error, and data', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve('data'),
    })

    await mutation.mutate()
    expect(mutation.status()).toBe('success')
    expect(mutation.data()).toBe('data')

    mutation.reset()
    expect(mutation.status()).toBe('idle')
    expect(mutation.error()).toBeNull()
    expect(mutation.data()).toBeUndefined()
  })

  // --- No cache provided ---

  it('works without cache (state tracking only)', async () => {
    const mutation = cachedMutation({
      mutationFn: (n: number) => Promise.resolve(n + 1),
    })

    const result = await mutation.mutate(5)
    expect(result).toBe(6)
    expect(mutation.status()).toBe('success')
  })

  // --- Return value ---

  it('mutate() returns result on success, undefined on error', async () => {
    const successMutation = cachedMutation({
      mutationFn: () => Promise.resolve(42),
    })
    expect(await successMutation.mutate()).toBe(42)

    const errorMutation = cachedMutation<undefined, string>({
      mutationFn: () => Promise.reject(new Error('fail')),
    })
    const errorResult = await errorMutation.mutate()
    expect(errorResult).toBeUndefined()
  })

  // --- Observable error ---

  it('handles Observable error in mutationFn', async () => {
    const mutation = cachedMutation({
      mutationFn: () => throwError(() => new Error('obs-error')),
    })

    await mutation.mutate()
    expect(mutation.status()).toBe('error')
    expect((mutation.error() as Error).message).toBe('obs-error')
  })
})
