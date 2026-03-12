import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { ZifluxDevtoolsComponent } from 'ziflux'
import { networkDelay } from './todo/fake-todo.interceptor'

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ZifluxDevtoolsComponent],
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    nav {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      height: 56px;
    }

    .logo {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--color-primary);
    }

    .nav-links {
      display: flex;
      gap: 16px;
    }

    .nav-links a {
      color: var(--color-text-muted);
      font-size: 0.9rem;
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      transition:
        color 0.15s,
        border-color 0.15s;
    }

    .nav-links a.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    .latency-control {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .latency-control select {
      padding: 2px 6px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: 0.8rem;
      background: var(--color-surface);
      color: var(--color-text);
    }

    main {
      max-width: 800px;
      margin: 32px auto;
      padding: 0 24px;
    }
  `,
  template: `
    <nav>
      <span class="logo">Ziflux Todo</span>
      <div class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
          >Todos</a
        >
        <a routerLink="/cache" routerLinkActive="active">Cache Inspector</a>
      </div>
      <div class="latency-control">
        <label for="latency">Latency</label>
        <select
          id="latency"
          [value]="networkDelay()"
          (change)="networkDelay.set(+$any($event.target).value)"
        >
          <option value="0">0ms</option>
          <option value="300">300ms</option>
          <option value="500">500ms</option>
          <option value="1500">1.5s</option>
          <option value="3000">3s</option>
        </select>
      </div>
    </nav>
    <main>
      <router-outlet />
    </main>
    <ziflux-devtools />
  `,
})
export class AppComponent {
  readonly networkDelay = networkDelay
}
