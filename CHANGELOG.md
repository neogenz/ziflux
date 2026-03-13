# Changelog


## v0.0.3

[compare changes](https://github.com/neogenz/ziflux/compare/v0.0.2...v0.0.3)

### Features

- **docs:** Add Vercel analytics ([d4d21fe](https://github.com/neogenz/ziflux/commit/d4d21fe))
- **skills:** Publish ziflux-expert skill ([7531d17](https://github.com/neogenz/ziflux/commit/7531d17))

### Bug Fixes

- **docs:** Update npm package references from ziflux to ngx-ziflux ([cd019b8](https://github.com/neogenz/ziflux/commit/cd019b8))
- **test:** Use fake timers before cache.set to prevent flaky timing ([59f19c3](https://github.com/neogenz/ziflux/commit/59f19c3))

### ❤️ Contributors

- Maxime De Sogus <maxime.desogus@gmail.com>

## v0.0.2


### Features

- Implement ziflux library — SWR caching for Angular resource() ([9805560](https://github.com/neogenz/ziflux/commit/9805560))
- Add cachedMutation() and anyLoading() utilities ([966ecad](https://github.com/neogenz/ziflux/commit/966ecad))
- **main:** Polish landing page visuals and add mobile navigation ([032bb72](https://github.com/neogenz/ziflux/commit/032bb72))
- **main:** Clarify landing page messaging and value prop ([ad48e0b](https://github.com/neogenz/ziflux/commit/ad48e0b))
- **main:** Add dark mode and overhaul landing page visuals ([9f95c6c](https://github.com/neogenz/ziflux/commit/9f95c6c))
- **main:** Update docs for new features and overhaul landing layout ([cd8d762](https://github.com/neogenz/ziflux/commit/cd8d762))
- **lib:** Add inspect, cleanup, retry, polling + rename gc/key for clarity ([3aa222d](https://github.com/neogenz/ziflux/commit/3aa222d))
- **main:** Polish SEO, update API terminology, and add interactive demo ([9da07ea](https://github.com/neogenz/ziflux/commit/9da07ea))
- **docs:** Add dual-tab animated demo with overlay mutation dialog ([84bf965](https://github.com/neogenz/ziflux/commit/84bf965))
- **lib:** Add devtools — cache inspector, structured logging & floating overlay ([68f5906](https://github.com/neogenz/ziflux/commit/68f5906))
- **example:** Add Todo demo app showcasing ziflux cache + devtools ([847cf58](https://github.com/neogenz/ziflux/commit/847cf58))
- **release:** Add changelogen, commitlint, and /release orchestration skill ([aec0b4b](https://github.com/neogenz/ziflux/commit/aec0b4b))
- **cache:** Add maxEntries with LRU eviction (D-26) ([11c6e76](https://github.com/neogenz/ziflux/commit/11c6e76))
- **main:** Refine mutation logic, add value sentinel & polish release docs ([69b0d2b](https://github.com/neogenz/ziflux/commit/69b0d2b))
- **branding:** Replace logo with dissolving pixel Z design ([0431a81](https://github.com/neogenz/ziflux/commit/0431a81))

### Bug Fixes

- **lib:** Audit fixes — staleTime: 0 bug, strict ESLint, retry abort cleanup ([161aa5f](https://github.com/neogenz/ziflux/commit/161aa5f))
- **cache:** Use strict < for staleTime comparison ([27da05f](https://github.com/neogenz/ziflux/commit/27da05f))
- **cache:** Guard empty prefix in invalidate, add prefix collision tests ([b98f73b](https://github.com/neogenz/ziflux/commit/b98f73b))
- **devtools:** Guard setInterval and keydown handler for SSR safety ([4d9cf6f](https://github.com/neogenz/ziflux/commit/4d9cf6f))
- **cache:** Clear in-flight promises on invalidate to prevent stale writes (D-27) ([5a14632](https://github.com/neogenz/ziflux/commit/5a14632))
- **cache:** Validate numeric config in DataCache constructor ([40348e6](https://github.com/neogenz/ziflux/commit/40348e6))
- Resolve review findings and critical retry race condition ([d76e1de](https://github.com/neogenz/ziflux/commit/d76e1de))
- **pre-launch:** ItemCache invalidation, error signal consistency, doc examples ([118d109](https://github.com/neogenz/ziflux/commit/118d109))

### Refactoring

- **main:** Simplify landing page visuals and architecture styles ([0da29b6](https://github.com/neogenz/ziflux/commit/0da29b6))
- **main:** Streamline landing page visuals and simplify component layouts ([bf390fb](https://github.com/neogenz/ziflux/commit/bf390fb))
- **main:** Slim down project context and sharpen dev rules ([5ff0ebc](https://github.com/neogenz/ziflux/commit/5ff0ebc))
- **example:** Extract stores + API service, add optimistic updates ([0bbcd76](https://github.com/neogenz/ziflux/commit/0bbcd76))
- **cache:** Move DataCache generic from class to per-method (D-30) ([470ad03](https://github.com/neogenz/ziflux/commit/470ad03))

### Documentation

- **lib:** Add JSDoc to entire public API ([ba9405c](https://github.com/neogenz/ziflux/commit/ba9405c))
- **readme:** Dx polish — merge setup, add testing, extract llms.txt ([e912ecc](https://github.com/neogenz/ziflux/commit/e912ecc))
- **readme:** Remove defensive tone, deduplicate architecture sections ([60383db](https://github.com/neogenz/ziflux/commit/60383db))
- **readme:** Rewrite why section with concrete value props ([85a3561](https://github.com/neogenz/ziflux/commit/85a3561))
- **landing:** Add guide, gotchas, testing; consolidate readme ([8f12fb1](https://github.com/neogenz/ziflux/commit/8f12fb1))
- **landing:** Redesign gotchas with cards and amber badges ([5c94543](https://github.com/neogenz/ziflux/commit/5c94543))
- **project:** Crystallize library philosophy and unopinionated design principles ([22c82eb](https://github.com/neogenz/ziflux/commit/22c82eb))
- **landing:** Simplify guide and quickstart layout ([ad8bf5a](https://github.com/neogenz/ziflux/commit/ad8bf5a))
- **landing:** Trim guide copy and remove redundant sections ([e931fb8](https://github.com/neogenz/ziflux/commit/e931fb8))
- **landing:** Eliminate redundancy, improve discoverability ([01176d9](https://github.com/neogenz/ziflux/commit/01176d9))
- Add contributing guide and update docs readme ([30859e0](https://github.com/neogenz/ziflux/commit/30859e0))
- **navbar:** Remove logo ([5dc1fe0](https://github.com/neogenz/ziflux/commit/5dc1fe0))

### Build

- Copy README and LICENSE into dist for npm publish ([4c6a35a](https://github.com/neogenz/ziflux/commit/4c6a35a))

### Chores

- Add skills-lock.json, gitignore Claude Code local dirs ([59c8329](https://github.com/neogenz/ziflux/commit/59c8329))
- **pre-launch:** Fix readme, add templates, enhance ci ([b73a5c5](https://github.com/neogenz/ziflux/commit/b73a5c5))
- **pre-launch:** Fix readme links, add engines field, example readme ([fa2bd77](https://github.com/neogenz/ziflux/commit/fa2bd77))
- Rename npm package to ngx-ziflux ([de7557c](https://github.com/neogenz/ziflux/commit/de7557c))

### Tests

- **mutation:** Add concurrent mutation tests, clear error on success ([1d6a627](https://github.com/neogenz/ziflux/commit/1d6a627))
- **resource:** Widen wall-clock timer margins to prevent CI flakes ([16ee139](https://github.com/neogenz/ziflux/commit/16ee139))
- **integration:** Add SWR lifecycle integration tests ([0a6e611](https://github.com/neogenz/ziflux/commit/0a6e611))

### ❤️ Contributors

- Maxime De Sogus <maxime.desogus@gmail.com>

## v0.0.1


### Features

- Implement ziflux library — SWR caching for Angular resource() ([9805560](https://github.com/neogenz/ziflux/commit/9805560))
- Add cachedMutation() and anyLoading() utilities ([966ecad](https://github.com/neogenz/ziflux/commit/966ecad))
- **main:** Polish landing page visuals and add mobile navigation ([032bb72](https://github.com/neogenz/ziflux/commit/032bb72))
- **main:** Clarify landing page messaging and value prop ([ad48e0b](https://github.com/neogenz/ziflux/commit/ad48e0b))
- **main:** Add dark mode and overhaul landing page visuals ([9f95c6c](https://github.com/neogenz/ziflux/commit/9f95c6c))
- **main:** Update docs for new features and overhaul landing layout ([cd8d762](https://github.com/neogenz/ziflux/commit/cd8d762))
- **lib:** Add inspect, cleanup, retry, polling + rename gc/key for clarity ([3aa222d](https://github.com/neogenz/ziflux/commit/3aa222d))
- **main:** Polish SEO, update API terminology, and add interactive demo ([9da07ea](https://github.com/neogenz/ziflux/commit/9da07ea))
- **docs:** Add dual-tab animated demo with overlay mutation dialog ([84bf965](https://github.com/neogenz/ziflux/commit/84bf965))
- **lib:** Add devtools — cache inspector, structured logging & floating overlay ([68f5906](https://github.com/neogenz/ziflux/commit/68f5906))
- **example:** Add Todo demo app showcasing ziflux cache + devtools ([847cf58](https://github.com/neogenz/ziflux/commit/847cf58))
- **release:** Add changelogen, commitlint, and /release orchestration skill ([aec0b4b](https://github.com/neogenz/ziflux/commit/aec0b4b))
- **cache:** Add maxEntries with LRU eviction (D-26) ([11c6e76](https://github.com/neogenz/ziflux/commit/11c6e76))

### Bug Fixes

- **lib:** Audit fixes — staleTime: 0 bug, strict ESLint, retry abort cleanup ([161aa5f](https://github.com/neogenz/ziflux/commit/161aa5f))
- **cache:** Use strict < for staleTime comparison ([27da05f](https://github.com/neogenz/ziflux/commit/27da05f))
- **cache:** Guard empty prefix in invalidate, add prefix collision tests ([b98f73b](https://github.com/neogenz/ziflux/commit/b98f73b))
- **devtools:** Guard setInterval and keydown handler for SSR safety ([4d9cf6f](https://github.com/neogenz/ziflux/commit/4d9cf6f))
- **cache:** Clear in-flight promises on invalidate to prevent stale writes (D-27) ([5a14632](https://github.com/neogenz/ziflux/commit/5a14632))
- **cache:** Validate numeric config in DataCache constructor ([40348e6](https://github.com/neogenz/ziflux/commit/40348e6))

### Refactoring

- **main:** Simplify landing page visuals and architecture styles ([0da29b6](https://github.com/neogenz/ziflux/commit/0da29b6))
- **main:** Streamline landing page visuals and simplify component layouts ([bf390fb](https://github.com/neogenz/ziflux/commit/bf390fb))
- **main:** Slim down project context and sharpen dev rules ([5ff0ebc](https://github.com/neogenz/ziflux/commit/5ff0ebc))
- **example:** Extract stores + API service, add optimistic updates ([0bbcd76](https://github.com/neogenz/ziflux/commit/0bbcd76))

### Documentation

- **lib:** Add JSDoc to entire public API ([ba9405c](https://github.com/neogenz/ziflux/commit/ba9405c))

### Build

- Copy README and LICENSE into dist for npm publish ([4c6a35a](https://github.com/neogenz/ziflux/commit/4c6a35a))

### Chores

- Add skills-lock.json, gitignore Claude Code local dirs ([59c8329](https://github.com/neogenz/ziflux/commit/59c8329))

### Tests

- **mutation:** Add concurrent mutation tests, clear error on success ([1d6a627](https://github.com/neogenz/ziflux/commit/1d6a627))
- **resource:** Widen wall-clock timer margins to prevent CI flakes ([16ee139](https://github.com/neogenz/ziflux/commit/16ee139))
- **integration:** Add SWR lifecycle integration tests ([0a6e611](https://github.com/neogenz/ziflux/commit/0a6e611))

### ❤️ Contributors

- Maxime De Sogus <maxime.desogus@gmail.com>

