import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { TodoDetailStore } from './todo-detail.store'

@Component({
  selector: 'app-todo-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  providers: [TodoDetailStore],
  template: `
    <div class="detail-container">
      <a routerLink="/" class="back-link">← Back to todos</a>

      @if (store.todo.isInitialLoading()) {
        <div class="skeleton">
          <div class="skeleton-title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      } @else if (store.todo.error()) {
        <div class="error-card">
          <p class="error-msg">Failed to load todo.</p>
          <button class="btn btn-retry" (click)="store.todo.reload()">Retry</button>
        </div>
      } @else if (store.todo.value(); as t) {
        <div class="todo-card">
          <div class="card-header">
            @if (store.editing()) {
              <input
                class="edit-input"
                [value]="store.editTitle()"
                (input)="store.editTitle.set($any($event.target).value)"
              />
            } @else {
              <h1 class="todo-title">{{ t.title }}</h1>
            }

            @if (store.todo.isStale()) {
              <span class="badge badge-stale">Refreshing…</span>
            }
          </div>

          <div class="meta">
            <span
              class="badge"
              [class.badge-done]="t.completed"
              [class.badge-pending]="!t.completed"
            >
              {{ t.completed ? 'Completed' : 'Pending' }}
            </span>
            <span class="created">Created {{ t.createdAt | date: 'mediumDate' }}</span>
          </div>

          <div class="actions">
            @if (store.editing()) {
              <button
                class="btn btn-primary"
                [disabled]="store.isSaving()"
                (click)="store.saveEdit(t)"
              >
                {{ store.isSaving() ? 'Saving…' : 'Save' }}
              </button>
              <button class="btn btn-secondary" (click)="store.cancelEdit()">Cancel</button>
              @if (store.saveError()) {
                <span class="error-inline">Save failed — please retry.</span>
              }
            } @else {
              <button class="btn btn-secondary" (click)="store.startEdit(t)">Edit</button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .detail-container {
      max-width: 640px;
      margin: 2rem auto;
      padding: 0 1rem;
      font-family: system-ui, sans-serif;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 1.5rem;
      color: var(--color-primary, #3b82f6);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .back-link:hover {
      text-decoration: underline;
    }

    .todo-card {
      background: var(--color-surface, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .todo-title {
      flex: 1;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text, #111827);
    }

    .edit-input {
      flex: 1;
      font-size: 1.25rem;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.375rem;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-muted, #6b7280);
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-done {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-pending {
      background: #fef9c3;
      color: #713f12;
    }
    .badge-stale {
      background: #dbeafe;
      color: #1e40af;
      font-size: 0.7rem;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: var(--color-primary, #3b82f6);
      color: #fff;
    }
    .btn-secondary {
      background: var(--color-surface-alt, #f3f4f6);
      color: var(--color-text, #111827);
    }
    .btn-retry {
      background: #fee2e2;
      color: #991b1b;
    }

    .error-card {
      padding: 1.5rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .error-msg {
      margin: 0;
      color: #991b1b;
    }
    .error-inline {
      font-size: 0.8rem;
      color: #b91c1c;
    }

    .skeleton {
      padding: 1.5rem;
    }
    .skeleton-title,
    .skeleton-line {
      background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 0.375rem;
      margin-bottom: 0.75rem;
    }
    .skeleton-title {
      height: 2rem;
      width: 60%;
    }
    .skeleton-line {
      height: 1rem;
      width: 80%;
    }
    .skeleton-line.short {
      width: 40%;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `,
})
export class TodoDetailComponent {
  id = input.required<string>()
  readonly store = inject(TodoDetailStore)

  constructor() {
    effect(() => this.store.load(this.id()))
  }
}
