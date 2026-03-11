import { computed, signal } from '@angular/core'
import { firstValueFrom, isObservable } from 'rxjs'
import type { CachedMutationOptions, CachedMutationRef, CachedMutationStatus } from './types'

export function cachedMutation<A = void, R = void, C = void>(
  options: CachedMutationOptions<A, R, C>,
): CachedMutationRef<A, R> {
  const { mutationFn, cache, invalidateKeys, onMutate, onSuccess, onError } = options

  const status = signal<CachedMutationStatus>('idle')
  const error = signal<unknown>(null)
  const data = signal<R | undefined>(undefined)

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void-arg pattern for no-arg mutations
  async function mutate(...rawArgs: A extends void ? [] : [args: A]): Promise<R | undefined> {
    const args = rawArgs[0] as A
    status.set('pending')
    error.set(null)

    let context: C | undefined
    try {
      if (onMutate) {
        context = await onMutate(args)
      }

      const result$ = mutationFn(args)
      const result = isObservable(result$) ? await firstValueFrom(result$) : await result$

      if (invalidateKeys && cache) {
        for (const key of invalidateKeys(args, result)) {
          cache.invalidate(key)
        }
      }

      data.set(result)
      status.set('success')
      onSuccess?.(result, args)
      return result
    } catch (err) {
      error.set(err)
      status.set('error')
      onError?.(err, args, context)
      return undefined
    }
  }

  function reset(): void {
    status.set('idle')
    error.set(null)
    data.set(undefined)
  }

  return {
    mutate,
    status: status.asReadonly(),
    isPending: computed(() => status() === 'pending'),
    error: error.asReadonly(),
    data: data.asReadonly(),
    reset,
  }
}
