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

  it('error is undefined on success, set on error', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.reject(new Error('boom')),
    })

    expect(mutation.error()).toBeUndefined()

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
    expect(mutation.error()).toBeUndefined()
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

  it('onSuccess is called before cache invalidation', async () => {
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
    expect(order).toEqual(['onSuccess', 'invalidate'])
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

  it('lifecycle order: onMutate → mutationFn → onSuccess → invalidateKeys', async () => {
    const order: string[] = []
    const cache = {
      invalidate: () => {
        order.push('invalidate')
      },
    }

    const mutation = cachedMutation({
      mutationFn: () => {
        order.push('mutationFn')
        return Promise.resolve('result')
      },
      cache,
      invalidateKeys: () => [['key']],
      onMutate: () => {
        order.push('onMutate')
      },
      onSuccess: () => {
        order.push('onSuccess')
      },
    })

    await mutation.mutate()
    expect(order).toEqual(['onMutate', 'mutationFn', 'onSuccess', 'invalidate'])
  })

  it('onSuccess can access optimistic data before invalidateKeys destroys it', async () => {
    const items = signal(['a', 'b'])
    const order: string[] = []
    const cache = {
      invalidate: () => {
        order.push('invalidate')
      },
    }

    const mutation = cachedMutation<string, string, string[]>({
      mutationFn: () => Promise.resolve('c-real'),
      cache,
      invalidateKeys: () => [['items']],
      onMutate: () => {
        const prev = items()
        items.update(v => [...v, 'c-temp'])
        order.push('onMutate')
        return prev
      },
      onSuccess: result => {
        order.push('onSuccess')
        // This must run BEFORE invalidateKeys so items still has the optimistic data
        items.update(v => v.map(i => (i === 'c-temp' ? result : i)))
      },
      onError: (_err, _args, context) => {
        if (context) items.set(context)
      },
    })

    await mutation.mutate('new-item')
    expect(order).toEqual(['onMutate', 'onSuccess', 'invalidate'])
    expect(items()).toEqual(['a', 'b', 'c-real'])
  })

  it('onSuccess throwing does not prevent invalidateKeys', async () => {
    const cache = { invalidate: vi.fn() }

    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve('result'),
      cache,
      invalidateKeys: () => [['key']],
      onSuccess: () => {
        throw new Error('callback-error')
      },
    })

    await mutation.mutate()
    expect(cache.invalidate).toHaveBeenCalledWith(['key'])
    expect(mutation.status()).toBe('success')
  })

  it('onError throwing does not reject the mutate() promise', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.reject(new Error('mutation-error')),
      onError: () => {
        throw new Error('callback-error')
      },
    })

    await mutation.mutate()
    expect(mutation.status()).toBe('error')
    expect((mutation.error() as Error).message).toBe('mutation-error')
  })

  it('error path: onMutate context is passed to onError, cache is not invalidated', async () => {
    const cache = { invalidate: vi.fn() }
    const items = signal(['a', 'b'])

    const mutation = cachedMutation<string, string, string[]>({
      mutationFn: () => Promise.reject(new Error('server error')),
      cache,
      invalidateKeys: () => [['items']],
      onMutate: () => {
        const prev = items()
        items.update(v => [...v, 'c-temp'])
        return prev
      },
      onError: (_err, _args, context) => {
        if (context) items.set(context)
      },
    })

    await mutation.mutate('new-item')
    expect(cache.invalidate).not.toHaveBeenCalled()
    expect(items()).toEqual(['a', 'b'])
    expect(mutation.status()).toBe('error')
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

  it('reset() cancels in-flight mutation ownership', async () => {
    let resolve!: (v: string) => void

    const mutation = cachedMutation({
      mutationFn: () => new Promise<string>(r => (resolve = r)),
    })

    const promise = mutation.mutate()
    expect(mutation.status()).toBe('pending')

    mutation.reset()
    expect(mutation.status()).toBe('idle')

    resolve('result')
    await promise

    // Status should still be 'idle', not overwritten to 'success'
    expect(mutation.status()).toBe('idle')
    expect(mutation.data()).toBeUndefined()
  })

  it('reset() clears status, error, and data', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.resolve('data'),
    })

    await mutation.mutate()
    expect(mutation.status()).toBe('success')
    expect(mutation.data()).toBe('data')

    mutation.reset()
    expect(mutation.status()).toBe('idle')
    expect(mutation.error()).toBeUndefined()
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

  // --- Concurrent mutations (latest-wins by call order per D-28) ---

  it('concurrent mutate() calls — latest call by invocation order wins on signals', async () => {
    let resolveFirst!: (v: string) => void
    let resolveSecond!: (v: string) => void

    const mutation = cachedMutation({
      mutationFn: (label: string) =>
        new Promise<string>(r => {
          if (label === 'first') resolveFirst = r
          else resolveSecond = r
        }),
    })

    const p1 = mutation.mutate('first')
    const p2 = mutation.mutate('second')
    expect(mutation.status()).toBe('pending')

    // second resolves first
    resolveSecond('second-result')
    await p2
    expect(mutation.data()).toBe('second-result')
    expect(mutation.status()).toBe('success')

    // first resolves later — signals should NOT be overwritten because second was called last
    resolveFirst('first-result')
    await p1
    expect(mutation.data()).toBe('second-result')
    expect(mutation.status()).toBe('success')
  })

  it('concurrent mutate() — error in first does not affect second (latest call wins)', async () => {
    let rejectFirst!: (e: Error) => void
    let resolveSecond!: (v: string) => void

    const mutation = cachedMutation({
      mutationFn: (label: string) =>
        new Promise<string>((resolve, reject) => {
          if (label === 'first') rejectFirst = reject
          else resolveSecond = resolve
        }),
    })

    const p1 = mutation.mutate('first')
    const p2 = mutation.mutate('second')

    // first errors but was not the latest call — signals must not update
    rejectFirst(new Error('fail'))
    await p1
    expect(mutation.status()).toBe('pending')
    expect(mutation.error()).toBeUndefined()

    resolveSecond('ok')
    await p2
    expect(mutation.status()).toBe('success')
    expect(mutation.data()).toBe('ok')
    expect(mutation.error()).toBeUndefined()
  })

  it('outdated mutation still invalidates cache but skips signal updates', async () => {
    let resolveFirst!: (v: string) => void
    let resolveSecond!: (v: string) => void
    const cache = { invalidate: vi.fn() }

    const onSuccess = vi.fn()
    const mutationWithCb = cachedMutation({
      mutationFn: (label: string) =>
        new Promise<string>(r => {
          if (label === 'first') resolveFirst = r
          else resolveSecond = r
        }),
      cache,
      invalidateKeys: (_args, result) => [[result]],
      onSuccess,
    })

    const p1 = mutationWithCb.mutate('first')
    const p2 = mutationWithCb.mutate('second')

    // first resolves while second is still in-flight — cache must invalidate but signals stay pending
    resolveFirst('first-result')
    await p1
    expect(cache.invalidate).toHaveBeenCalledWith(['first-result'])
    expect(mutationWithCb.data()).toBeUndefined()
    expect(mutationWithCb.status()).toBe('pending')
    expect(onSuccess).not.toHaveBeenCalled()

    resolveSecond('second-result')
    await p2
    expect(cache.invalidate).toHaveBeenCalledWith(['second-result'])
    expect(mutationWithCb.data()).toBe('second-result')
    expect(mutationWithCb.status()).toBe('success')
    expect(onSuccess).toHaveBeenCalledWith('second-result', 'second')
  })

  it('handles Observable error in mutationFn', async () => {
    const mutation = cachedMutation({
      mutationFn: () => throwError(() => new Error('obs-error')),
    })

    await mutation.mutate()
    expect(mutation.status()).toBe('error')
    expect((mutation.error() as Error).message).toBe('obs-error')
  })
})
