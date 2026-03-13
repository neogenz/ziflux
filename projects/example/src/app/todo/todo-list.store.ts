import { computed, inject, Injectable, signal } from '@angular/core'
import { anyLoading, cachedMutation, cachedResource } from 'ziflux'
import { TodoApi } from './todo.api'
import type { Todo } from './todo.model'

@Injectable()
export class TodoListStore {
  readonly #api = inject(TodoApi)
  readonly pollingEnabled = signal(false)

  readonly todos = cachedResource<Todo[]>({
    cache: this.#api.listCache,
    cacheKey: ['todos'],
    loader: () => this.#api.getAll$(),
    staleTime: 5_000,
    refetchInterval: () => (this.pollingEnabled() ? 3_000 : false),
  })

  readonly #add = cachedMutation<string, Todo, Todo[]>({
    mutationFn: title => this.#api.create$(title),
    cache: this.#api.listCache,
    invalidateKeys: () => [['todos']],
    onMutate: title => {
      const current = this.todos.value() ?? []
      const optimistic: Todo = {
        id: -Date.now(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      const updated = [...current, optimistic]
      this.todos.set(updated)
      this.#api.listCache.set(['todos'], updated)
      return current
    },
    onError: (_err, _title, previousList) => {
      if (previousList) {
        this.todos.set(previousList)
        this.#api.listCache.set(['todos'], previousList)
      }
    },
  })

  readonly #toggle = cachedMutation<Todo, Todo>({
    mutationFn: todo => this.#api.update$(todo.id, { completed: !todo.completed }),
    cache: this.#api.listCache,
    invalidateKeys: todo => [['todos'], ['todos', String(todo.id)]],
  })

  readonly #delete = cachedMutation<Todo, null, Todo[]>({
    mutationFn: todo => this.#api.delete$(todo.id),
    cache: this.#api.listCache,
    invalidateKeys: () => [['todos']],
    onMutate: todo => {
      const current = this.todos.value() ?? []
      const filtered = current.filter(t => t.id !== todo.id)
      this.todos.set(filtered)
      this.#api.listCache.set(['todos'], filtered)
      return current
    },
    onError: (_err, _todo, previousList) => {
      if (previousList) {
        this.todos.set(previousList)
        this.#api.listCache.set(['todos'], previousList)
      }
    },
  })

  readonly isAdding = this.#add.isPending
  readonly isToggling = this.#toggle.isPending
  readonly isDeleting = this.#delete.isPending

  readonly isAnyLoading = anyLoading(
    this.todos.isLoading,
    this.isAdding,
    this.isToggling,
    this.isDeleting,
  )

  readonly completedCount = computed(
    () => (this.todos.value() ?? []).filter(t => t.completed).length,
  )

  async addTodo(title: string): Promise<void> {
    await this.#add.mutate(title)
  }

  toggleTodo(todo: Todo): void {
    void this.#toggle.mutate(todo)
  }

  deleteTodo(todo: Todo): void {
    void this.#delete.mutate(todo)
  }

  prefetchTodo(id: number): void {
    void this.#api.prefetchById(id)
  }
}
