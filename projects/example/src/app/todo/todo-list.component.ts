import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { anyLoading, cachedMutation, cachedResource } from 'ziflux'
import type { CachedMutationRef, CachedResourceRef } from 'ziflux'
import { TodoCacheService } from './todo.cache'
import type { Todo } from './todo.model'

@Component({
  selector: 'app-todo-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <!-- Header -->
    <div class="header">
      <h1>Todos</h1>
      <div class="header-actions">
        @if (isAnyLoading()) {
          <span class="loading-badge">Loading...</span>
        }
        @if (todos.isStale() && !todos.isInitialLoading()) {
          <span class="stale-badge">Refreshing...</span>
        }
        <button (click)="todos.reload()">Reload</button>
        <button [class.primary]="pollingEnabled()" (click)="pollingEnabled.update(v => !v)">
          Polling: {{ pollingEnabled() ? 'ON (3s)' : 'OFF' }}
        </button>
      </div>
    </div>

    <!-- Add form -->
    <div class="card add-form">
      <input
        #titleInput
        type="text"
        placeholder="New todo title..."
        (keydown.enter)="addTodo(titleInput)"
      />
      <button class="primary" [disabled]="addMutation.isPending()" (click)="addTodo(titleInput)">
        {{ addMutation.isPending() ? 'Adding...' : 'Add' }}
      </button>
    </div>

    <!-- Todo list -->
    <div class="card todo-card">
      @if (todos.isInitialLoading()) {
        <div class="skeleton-list">
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
        </div>
      } @else {
        <ul class="todo-list">
          @for (todo of todos.value() ?? []; track todo.id) {
            <li class="todo-item" [class.completed]="todo.completed">
              <input
                type="checkbox"
                [checked]="todo.completed"
                [disabled]="toggleMutation.isPending()"
                (change)="toggleTodo(todo)"
              />
              <a
                [routerLink]="['/todos', todo.id]"
                class="todo-title"
                (mouseenter)="prefetchTodo(todo.id)"
                >{{ todo.title }}</a
              >
              <button
                class="danger delete-btn"
                [disabled]="deleteMutation.isPending()"
                (click)="deleteTodo(todo)"
              >
                {{ deleteMutation.isPending() ? '...' : 'Delete' }}
              </button>
            </li>
          }
        </ul>
      }
    </div>

    <!-- Footer -->
    @if (todos.hasValue()) {
      <div class="footer">
        <span>{{ (todos.value() ?? []).length }} todos</span>
        <span>&mdash;</span>
        <span>{{ completedCount() }} completed</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 600px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .header h1 {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .loading-badge {
      font-size: 0.75rem;
      background: var(--color-primary);
      color: white;
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .stale-badge {
      font-size: 0.75rem;
      background: var(--color-stale);
      color: white;
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .add-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .add-form input {
      flex: 1;
    }

    .todo-card {
      margin-bottom: 1rem;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .skeleton-item {
      height: 36px;
      background: linear-gradient(
        90deg,
        var(--color-border) 25%,
        #f0f0f0 50%,
        var(--color-border) 75%
      );
      background-size: 200% 100%;
      border-radius: var(--radius);
      animation: shimmer 1.2s infinite;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border);
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-item.completed .todo-title {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .todo-title {
      flex: 1;
      font-size: 0.9rem;
    }

    .delete-btn {
      padding: 4px 10px;
      font-size: 0.8rem;
    }

    .footer {
      display: flex;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
  `,
})
export class TodoListComponent {
  readonly #http = inject(HttpClient)
  readonly #caches = inject(TodoCacheService)

  readonly pollingEnabled = signal(false)

  readonly todos: CachedResourceRef<Todo[]> = cachedResource<Todo[], Record<string, never>>({
    cache: this.#caches.listCache,
    cacheKey: ['todos'],
    params: () => ({}),
    loader: () => this.#http.get<Todo[]>('/api/todos'),
    staleTime: 5_000,
    refetchInterval: () => (this.pollingEnabled() ? 3_000 : false),
  })

  readonly addMutation: CachedMutationRef<string, Todo> = cachedMutation<string, Todo>({
    mutationFn: title => this.#http.post<Todo>('/api/todos', { title }),
    cache: this.#caches.listCache,
    invalidateKeys: () => [['todos']],
  })

  readonly toggleMutation: CachedMutationRef<Todo, Todo> = cachedMutation<Todo, Todo>({
    mutationFn: todo =>
      this.#http.patch<Todo>(`/api/todos/${todo.id}`, { completed: !todo.completed }),
    cache: this.#caches.listCache,
    invalidateKeys: todo => [['todos'], ['todos', String(todo.id)]],
  })

  readonly deleteMutation: CachedMutationRef<Todo, null> = cachedMutation<Todo, null, Todo[]>({
    mutationFn: todo => this.#http.delete<null>(`/api/todos/${todo.id}`),
    cache: this.#caches.listCache,
    invalidateKeys: () => [['todos']],
    onMutate: todo => {
      const current = this.todos.value() ?? []
      const filtered = current.filter(t => t.id !== todo.id)
      this.todos.set(filtered)
      this.#caches.listCache.set(['todos'], filtered)
      return current
    },
    onError: (_err, _todo, previousList) => {
      if (previousList) {
        this.todos.set(previousList)
        this.#caches.listCache.set(['todos'], previousList)
      }
    },
  })

  readonly isAnyLoading = anyLoading(
    this.todos.isLoading,
    this.addMutation.isPending,
    this.toggleMutation.isPending,
    this.deleteMutation.isPending,
  )

  readonly completedCount = computed(
    () => (this.todos.value() ?? []).filter(t => t.completed).length,
  )

  async addTodo(input: HTMLInputElement): Promise<void> {
    const title = input.value.trim()
    if (!title) return
    await this.addMutation.mutate(title)
    input.value = ''
  }

  toggleTodo(todo: Todo): void {
    void this.toggleMutation.mutate(todo)
  }

  deleteTodo(todo: Todo): void {
    void this.deleteMutation.mutate(todo)
  }

  async prefetchTodo(id: number): Promise<void> {
    await this.#caches.itemCache.prefetch(['todos', String(id)], () =>
      firstValueFrom(this.#http.get<Todo>(`/api/todos/${id}`)),
    )
  }
}
