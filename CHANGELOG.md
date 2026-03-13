# Changelog


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

