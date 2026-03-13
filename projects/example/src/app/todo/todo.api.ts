import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import type { Observable } from 'rxjs'
import { firstValueFrom } from 'rxjs'
import { DataCache } from 'ziflux'
import type { Todo } from './todo.model'

@Injectable({ providedIn: 'root' })
export class TodoApi {
  readonly listCache = new DataCache({ name: 'todo-list', staleTime: 5_000, maxEntries: 50 })
  readonly itemCache = new DataCache({ name: 'todo-item', staleTime: 10_000 })
  readonly #http = inject(HttpClient)

  getAll$(): Observable<Todo[]> {
    return this.#http.get<Todo[]>('/api/todos')
  }

  getById$(id: string): Observable<Todo> {
    return this.#http.get<Todo>(`/api/todos/${id}`)
  }

  create$(title: string): Observable<Todo> {
    return this.#http.post<Todo>('/api/todos', { title })
  }

  update$(id: number, body: Partial<Todo>): Observable<Todo> {
    return this.#http.patch<Todo>(`/api/todos/${id}`, body)
  }

  delete$(id: number): Observable<null> {
    return this.#http.delete<null>(`/api/todos/${id}`)
  }

  prefetchById(id: number): Promise<void> {
    return this.itemCache.prefetch(['todos', String(id)], () =>
      firstValueFrom(this.#http.get<Todo>(`/api/todos/${id}`)),
    )
  }
}
