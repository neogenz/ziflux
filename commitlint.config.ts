import type { UserConfig } from '@commitlint/types'

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'ci', 'build', 'style'],
    ],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
}

export default config
