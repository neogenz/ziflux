import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideZonelessChangeDetection } from '@angular/core'
import { provideZiflux, withDevtools } from 'ziflux'

import { AppComponent } from './app/app.component'
import { routes } from './app/app.routes'
import { fakeTodoInterceptor } from './app/todo/fake-todo.interceptor'

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([fakeTodoInterceptor])),
    provideZiflux({ staleTime: 5_000, expireTime: 30_000 }, withDevtools({ logOperations: true })),
  ],
})
