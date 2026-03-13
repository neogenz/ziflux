import { computed, signal } from '@angular/core'
import { firstValueFrom, isObservable } from 'rxjs'
import type { CachedMutationOptions, CachedMutationRef, CachedMutationStatus } from './types'

/**
 * Creates a mutation handler with signal-based status tracking.
 *
 * Lifecycle per `mutate()` call: `idle` → `pending` → `success | error`.
 * On success, `invalidateKeys` entries are marked stale in the cache, which
 * causes any active `cachedResource` watching those keys to revalidate.
 * `mutate()` never rejects — errors are captured in the `error` signal.
 *
 * @remarks
 * Concurrent calls follow latest-wins-by-call-order semantics: only the most
 * recently invoked `mutate()` updates reactive signals and fires lifecycle
 * callbacks. Cache invalidation runs for all successful mutations regardless.
 * Capture the `mutate()` return value if you need an earlier call's result.
 *
 * @example
 * ```ts
 * readonly createTodo = cachedMutation({
 *   cache: this.todoApi.cache,
 *   mutationFn: (todo: NewTodo) => this.http.post<Todo>('/api/todos', todo),
 *   invalidateKeys: () => [['todos']],
 * });
 *
 * // In template or method:
 * await this.createTodo.mutate({ title: 'Buy milk' });
 * ```
 */
export function cachedMutation<A = void, R = void, C = void>(
  options: CachedMutationOptions<A, R, C>,
): CachedMutationRef<A, R> {
  const { mutationFn, cache, invalidateKeys, onMutate, onSuccess, onError } = options

  const status = signal<CachedMutationStatus>('idle')
  const error = signal<unknown>(null)
  const data = signal<R | undefined>(undefined)

  let callCounter = 0

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void-arg pattern for no-arg mutations
  async function mutate(...rawArgs: A extends void ? [] : [args: A]): Promise<R | undefined> {
    const thisCallId = ++callCounter
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

      if (thisCallId === callCounter) {
        data.set(result)
        error.set(null)
        status.set('success')
        onSuccess?.(result, args)
      }

      return result
    } catch (err) {
      if (thisCallId === callCounter) {
        error.set(err)
        status.set('error')
        onError?.(err, args, context)
      }
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
