# Contributing to ziflux

Thanks for your interest in contributing. ziflux is a small, focused library — every contribution matters.

## Before You Start

- **Questions?** Open a [GitHub Discussion](https://github.com/neogenz/ziflux/discussions), not an issue.
- **Bug?** Open an [issue](https://github.com/neogenz/ziflux/issues) with a minimal reproduction.
- **Feature idea?** Open an issue to discuss before writing code. This prevents wasted effort if the feature doesn't fit the library's scope.

### Scope

ziflux is a cache layer, not a state manager. Contributions must align with the [library philosophy](./CLAUDE.md#philosophy):

- **No new patterns** — the API must feel like Angular's `resource()` extended
- **No RxJS for state** — Signals only
- **No abstractions for single-use code** — keep it simple

When in doubt, read [decision.md](./decision.md) — it captures the reasoning behind every architectural choice.

## Development Setup

### Prerequisites

- **Node.js** — check `.nvmrc` (use `nvm use`)
- **pnpm 10+** — `corepack enable && corepack prepare`
- **Angular CLI 21+** — comes with dev dependencies

### Getting Started

```bash
git clone https://github.com/neogenz/ziflux.git
cd ziflux
pnpm install
```

### Project Structure

```
ziflux/
├── projects/ziflux/       # Library source (what ships to npm)
│   ├── src/lib/           # Implementation
│   └── src/public-api.ts  # Public exports
├── projects/example/      # Example Angular app (Todo)
├── docs/                  # Documentation site (Next.js)
├── decision.md            # Architectural decision log
└── CHANGELOG.md
```

### Commands

| Command | What it does |
| --- | --- |
| `pnpm build` | Build library via ng-packagr → `dist/ziflux/` |
| `pnpm test` | Run all tests (Vitest, no watch) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | `tsc --noEmit` against library tsconfig |
| `pnpm lint` | ESLint (angular-eslint + typescript-eslint) |
| `pnpm lint:fix` | Lint with auto-fix |
| `pnpm format` | Prettier — format all `.ts` files |
| `pnpm format:check` | Check formatting without writing |
| `cd docs && pnpm dev` | Documentation site dev server |

### Pre-commit Hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs automatically on commit:

- **typecheck** — `pnpm typecheck`
- **lint** — `pnpm lint`
- **format** — `pnpm format:check`
- **test** — `pnpm test`
- **commit message** — [Conventional Commits](https://www.conventionalcommits.org/) enforced via commitlint

All four checks run in parallel. If any fails, the commit is blocked. Fix the issue and commit again.

## Making Changes

### 1. Fork & branch

```bash
git checkout -b feat/your-feature
```

### 2. Write code

- Follow existing patterns — read the files around your change
- Private fields use `#` prefix
- No `any`, no `as unknown as`
- No Subjects/BehaviorSubjects/Observables for state

### 3. Write tests

Every change needs tests. Run them:

```bash
pnpm test
```

Tests use Vitest with Angular's `@angular/build:unit-test` builder. Look at existing `.spec.ts` files for patterns.

### 4. Verify everything passes

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### 5. Commit

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): brief description
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`
**Scope:** `cache`, `resource`, `mutation`, `devtools`, `config`, `docs`, `example`

Examples:
```
feat(cache): add LRU eviction strategy
fix(resource): handle abort signal during retry
docs(guide): clarify singleton constraint
```

### 6. Open a PR

- Keep PRs focused — one feature or fix per PR
- Reference the related issue if there is one
- Describe what changed and why
- If it's an API change, explain the DX impact

## Architectural Decisions

If your PR introduces or changes an architectural choice, add a `D-XX` entry to [decision.md](./decision.md). Follow the existing format:

```markdown
## D-XX — Short title

**Decision:** What you decided.
**Rationale:** Why this choice over alternatives.
**Rejected alternative:** What you didn't do and why.
```

## Documentation

- **Library changes** that affect the public API → update the [docs site](./docs/) and the root [README.md](./README.md)
- **Example app** → update `projects/example/` if the change adds a new pattern worth demonstrating

## AI Assistance

If you used AI tools to generate code, that's fine — but review it carefully. AI-generated code must meet the same quality bar as hand-written code. We don't require disclosure, but we do require understanding: you should be able to explain every line in your PR.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
