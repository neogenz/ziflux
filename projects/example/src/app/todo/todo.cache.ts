import { Injectable } from '@angular/core'
import { DataCache, injectCachedHttp } from 'ziflux'
import { Todo } from './todo.model'

@Injectable({ providedIn: 'root' })
export class TodoCacheService {
  readonly listCache = new DataCache<Todo[]>({ name: 'todo-list', staleTime: 5_000 })
  readonly itemCache = new DataCache<Todo>({ name: 'todo-item', staleTime: 10_000 })

  /** Demonstrates injectCachedHttp — cached HTTP client for individual todos */
  readonly cachedHttp = injectCachedHttp<Todo>(this.itemCache)
}
