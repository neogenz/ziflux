import { HttpInterceptorFn, HttpResponse } from '@angular/common/http'
import { delay, of } from 'rxjs'
import { Todo } from './todo.model'

let nextId = 4

const TODOS: Todo[] = [
  { id: 1, title: 'Learn Angular Signals', completed: true, createdAt: '2026-03-01T10:00:00Z' },
  { id: 2, title: 'Try ziflux caching', completed: false, createdAt: '2026-03-05T14:30:00Z' },
  { id: 3, title: 'Build a demo app', completed: false, createdAt: '2026-03-10T09:15:00Z' },
]

function randomDelay(): number {
  return 300 + Math.random() * 500
}

export const fakeTodoInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url

  // GET /api/todos
  if (url === '/api/todos' && req.method === 'GET') {
    return of(new HttpResponse({ status: 200, body: [...TODOS] })).pipe(delay(randomDelay()))
  }

  // GET /api/todos/:id
  const getMatch = url.match(/^\/api\/todos\/(\d+)$/)
  if (getMatch && req.method === 'GET') {
    const id = Number(getMatch[1])
    const todo = TODOS.find(t => t.id === id)
    if (!todo) {
      return of(new HttpResponse({ status: 404, body: { error: 'Not found' } })).pipe(
        delay(randomDelay()),
      )
    }
    return of(new HttpResponse({ status: 200, body: { ...todo } })).pipe(delay(randomDelay()))
  }

  // POST /api/todos
  if (url === '/api/todos' && req.method === 'POST') {
    const body = req.body as Partial<Todo>
    const todo: Todo = {
      id: nextId++,
      title: body.title ?? 'Untitled',
      completed: false,
      createdAt: new Date().toISOString(),
    }
    TODOS.push(todo)
    return of(new HttpResponse({ status: 201, body: { ...todo } })).pipe(delay(randomDelay()))
  }

  // PATCH /api/todos/:id
  const patchMatch = url.match(/^\/api\/todos\/(\d+)$/)
  if (patchMatch && req.method === 'PATCH') {
    const id = Number(patchMatch[1])
    const index = TODOS.findIndex(t => t.id === id)
    if (index === -1) {
      return of(new HttpResponse({ status: 404, body: { error: 'Not found' } })).pipe(
        delay(randomDelay()),
      )
    }
    Object.assign(TODOS[index], req.body)
    return of(new HttpResponse({ status: 200, body: { ...TODOS[index] } })).pipe(
      delay(randomDelay()),
    )
  }

  // DELETE /api/todos/:id
  const deleteMatch = url.match(/^\/api\/todos\/(\d+)$/)
  if (deleteMatch && req.method === 'DELETE') {
    const id = Number(deleteMatch[1])
    const index = TODOS.findIndex(t => t.id === id)
    if (index !== -1) {
      TODOS.splice(index, 1)
    }
    return of(new HttpResponse({ status: 204, body: null })).pipe(delay(randomDelay()))
  }

  return next(req)
}
