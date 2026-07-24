/**
 * ng-packagr adds `tslib` to the generated package.json unconditionally.
 * With `importHelpers: false` TypeScript inlines the few helpers it needs
 * instead of importing them, so the dependency is dead weight — and "zero
 * dependencies" is one of the library's headline claims.
 *
 * Fails the build if a tslib import ever does appear, so the claim can never
 * silently become false.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const bundle = 'dist/ziflux/fesm2022/ngx-ziflux.mjs'
const manifest = 'dist/ziflux/package.json'

if (/from\s+['"]tslib['"]/.test(readFileSync(bundle, 'utf8'))) {
  console.error(
    `strip-tslib: ${bundle} imports tslib. Either keep the dependency or set "importHelpers": false.`,
  )
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
delete pkg.dependencies?.tslib
if (pkg.dependencies && Object.keys(pkg.dependencies).length === 0) delete pkg.dependencies
writeFileSync(manifest, `${JSON.stringify(pkg, null, 2)}\n`)
