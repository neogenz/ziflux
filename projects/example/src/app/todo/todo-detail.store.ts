import { inject, Injectable, signal } from '@angular/core'
import { cachedMutation, cachedResource } from 'ziflux'
import { TodoApi } from './todo.api'
import type { Todo } from './todo.model'

@Injectable()
export class TodoDetailStore {
  readonly #api = inject(TodoApi)
  readonly #id = signal<string | null>(null)

  readonly todo = cachedResource<Todo, { id: string }>({
    cache: this.#api.itemCache,
    cacheKey: params => ['todos', params.id],
    params: () => {
      const id = this.#id()
      return id ? { id } : undefined
    },
    loader: ({ params }) => this.#api.getById$(params.id),
    staleTime: 10_000,
    retry: { maxRetries: 3, baseDelay: 1_000, maxDelay: 5_000 },
  })

  readonly editing = signal(false)
  readonly editTitle = signal('')

  readonly #editMutation = cachedMutation<{ id: number; title: string }, Todo>({
    mutationFn: args => this.#api.update$(args.id, { title: args.title }),
    cache: this.#api.listCache,
    invalidateKeys: args => [['todos'], ['todos', String(args.id)]],
    onSuccess: (_result, args) => {
      this.#api.itemCache.invalidate(['todos', String(args.id)])
      this.editing.set(false)
    },
    onError: err => console.error('Edit failed:', err),
  })

  readonly isSaving = this.#editMutation.isPending
  readonly saveError = this.#editMutation.error

  load(id: string): void {
    this.#id.set(id)
  }

  startEdit(todo: Todo): void {
    this.editTitle.set(todo.title)
    this.editing.set(true)
  }

  cancelEdit(): void {
    this.editing.set(false)
    this.#editMutation.reset()
  }

  saveEdit(todo: Todo): void {
    void this.#editMutation.mutate({ id: todo.id, title: this.editTitle() })
  }
}
