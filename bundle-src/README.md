# `@derico/aurora-promo-block`

The Promo block's Aurora half. This is a real npm package (block add-on
contract §1.1: the editor half belongs to the Aurora ecosystem, Blicca
ownership lives only in the Python package) *and* the source for the bundle
committed into `../src/derico/blicca/promoblock/static/`.

Two consumers, one source:

| consumer | artifact | entry |
| --- | --- | --- |
| Blicca `@@aurora-edit` | the scope-wrapped Plone static bundle, runtime-imported per contract §4 | `install(config)` via `blockAddons` |
| Aurora proper | this npm package, a source dependency | `install(config)` from the app's registry config |

The load-bearing shared surface is `install(config)` plus `edit` and `view`.

## Commands

```bash
pnpm install
pnpm build      # -> ../src/derico/blicca/promoblock/static/promo-block.{js,css,js.map}
pnpm test
pnpm typecheck
```

**Build artifacts are committed and never built at install time.** There is
no Node on the deploy host; rebuild here and commit the result whenever
`src/` changes.

If `pnpm install` fails with a sqlite "disk I/O error", the store is on a
filesystem it cannot lock — use `pnpm install --store-dir /dev/shm/pnpm-store`.

## Why the build looks the way it does

`vite.config.ts` is `collective.fragmentsblock`'s, near-verbatim, because
contract §1.2 fixes most of it: ESM lib output, `esbuild: { jsx: 'automatic' }`
(lib mode's default classic transform crashes at render on the missing global
React), and the eight promised shared modules kept external. They are resolved
in the browser through the `@@aurora-edit` import map to the host's own
facades; one leaking into the bundle means two Reacts and a null hook
dispatcher, so `assertNoSharedInBundle()` fails the build instead.

`build-plugins/scope-wrap.ts` is copied unmodified. Only `scopeRoots` and
`scopeLimit` are configurable and the contract fixes both.

## Why the tests have no facade stubs

`@plone/registry` and `@plone/helpers` are installed for real, at the versions
the host provides. `test/upstream-registry.ts` supplies the thing that
genuinely is not on npm: a registry carrying **Aurora's registrations and no
more**, so a field that only works because the Blicca wrapper registered
something fails here rather than in production.
