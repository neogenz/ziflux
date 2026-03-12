import type { ChangelogConfig } from 'changelogen'

const config: ChangelogConfig = {
  types: {
    feat: { title: 'Features', semver: 'minor' },
    fix: { title: 'Bug Fixes', semver: 'patch' },
    perf: { title: 'Performance', semver: 'patch' },
    refactor: { title: 'Refactoring' },
    docs: { title: 'Documentation' },
    chore: { title: 'Chores' },
    test: { title: 'Tests' },
    build: { title: 'Build' },
    ci: { title: 'CI/CD' },
  },
  output: 'CHANGELOG.md',
  repo: {
    provider: 'github',
    domain: 'github.com',
    repo: 'neogenz/ziflux',
  },
}

export default config
