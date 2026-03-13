import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TodoListStore } from './todo-list.store'

@Component({
  selector: 'app-todo-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [TodoListStore],
  template: `
    <!-- Header -->
    <div class="header">
      <h1>Todos</h1>
      <div class="header-actions">
        @if (store.isAnyLoading()) {
          <span class="loading-badge">Loading...</span>
        }
        @if (store.todos.isStale() && !store.todos.isInitialLoading()) {
          <span class="stale-badge">Refreshing...</span>
        }
        <button (click)="store.todos.reload()">Reload</button>
        <button
          [class.primary]="store.pollingEnabled()"
          (click)="store.pollingEnabled.update(v => !v)"
        >
          Polling: {{ store.pollingEnabled() ? 'ON (3s)' : 'OFF' }}
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
      <button class="primary" [disabled]="store.isAdding()" (click)="addTodo(titleInput)">
        {{ store.isAdding() ? 'Adding...' : 'Add' }}
      </button>
    </div>

    <!-- Todo list -->
    <div class="card todo-card">
      @if (store.todos.error() && !store.todos.hasValue()) {
        <div class="card error-card">
          <p>Failed to load todos.</p>
          <button (click)="store.todos.reload()">Retry</button>
        </div>
      } @else if (store.todos.isInitialLoading()) {
        <div class="skeleton-list">
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
        </div>
      } @else {
        <ul class="todo-list">
          @for (todo of store.todos.value() ?? []; track todo.id) {
            <li class="todo-item" [class.completed]="todo.completed">
              <input
                type="checkbox"
                [checked]="todo.completed"
                [disabled]="store.isToggling()"
                (change)="store.toggleTodo(todo)"
              />
              <a
                [routerLink]="['/todos', todo.id]"
                class="todo-title"
                (mouseenter)="store.prefetchTodo(todo.id)"
                >{{ todo.title }}</a
              >
              <button
                class="danger delete-btn"
                [disabled]="store.isDeleting()"
                (click)="store.deleteTodo(todo)"
              >
                {{ store.isDeleting() ? '...' : 'Delete' }}
              </button>
            </li>
          } @empty {
            <li class="empty-state">No todos yet — add one above.</li>
          }
        </ul>
      }
    </div>

    <!-- Footer -->
    @if (store.todos.hasValue()) {
      <div class="footer">
        <span>{{ (store.todos.value() ?? []).length }} todos</span>
        <span>&mdash;</span>
        <span>{{ store.completedCount() }} completed</span>
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

    .empty-state {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-text-muted);
      font-style: italic;
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
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
  readonly store = inject(TodoListStore)

  async addTodo(input: HTMLInputElement): Promise<void> {
    const title = input.value.trim()
    if (!title) return
    await this.store.addTodo(title)
    input.value = ''
  }
}
