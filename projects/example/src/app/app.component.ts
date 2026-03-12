import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { ZifluxDevtoolsComponent } from 'ziflux'

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

    .loading-bar {
      height: 3px;
      background: var(--color-primary);
      animation: loading 1.5s ease-in-out infinite;
    }

    @keyframes loading {
      0% {
        width: 0;
        margin-left: 0;
      }
      50% {
        width: 60%;
        margin-left: 20%;
      }
      100% {
        width: 0;
        margin-left: 100%;
      }
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
    </nav>
    @if (loading()) {
      <div class="loading-bar"></div>
    }
    <main>
      <router-outlet />
    </main>
    <ziflux-devtools />
  `,
})
export class AppComponent {
  loading = signal(false)
}
