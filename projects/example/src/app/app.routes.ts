import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./todo/todo-list.component').then(m => m.TodoListComponent),
  },
  {
    path: 'todos/:id',
    loadComponent: () => import('./todo/todo-detail.component').then(m => m.TodoDetailComponent),
  },
  {
    path: 'cache',
    loadComponent: () =>
      import('./cache-inspector/cache-inspector.component').then(m => m.CacheInspectorComponent),
  },
]
