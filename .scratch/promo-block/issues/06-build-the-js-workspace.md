# Build: the `bundle-src/` npm workspace

Type: build
Status: resolved
Blocked by: 05

## Question

Stand up the publishable Aurora half, copying `collective.fragmentsblock`'s
workspace rather than inventing one.

- **`package.json`**: name `@derico/aurora-promo-block`, `exports` pointing at
  `./src/index.tsx`, peer deps `@plone/registry`, `@plone/helpers`,
  `react ^18 || ^19`. This is the npm release the dual-ecosystem rule (§1.1)
  asks for; the block is **not** a brand block and the single-ecosystem
  exemption does not apply.
- **`vite.config.ts`**: copy fragmentsblock's near-verbatim — ESM lib build,
  `esbuild: { jsx: 'automatic' }` (lib mode's default classic transform crashes
  at render on the missing global React), the eight `SHARED_MODULES` as
  `rollupOptions.external`, `outDir` into the Python package's `static/`,
  `minify: false`, `sourcemap: true`.
- **`build-plugins/scope-wrap.ts`**: copy as-is. Only `scopeRoots`
  (`.aurora-editor`, `.aurora-editor-portal`, `.aurora-blocks-view`) and
  `scopeLimit` (`.aurora-pattern-island`) are configurable and the contract
  fixes both. Register it with `enforce: 'post'`.
- **`assertNoSharedInBundle()`**: copy it. A promised singleton leaking into the
  bundle means two Reacts and a null hook dispatcher at runtime; the build must
  fail instead.
- **vitest** with `@plone/registry` and `@plone/helpers` aliased to local stubs,
  as fragmentsblock does. Per ticket 02, the stub registry is also where
  native-Aurora divergence gets tested, so build it to represent **upstream**
  registrations, not Blicca's.
- **Artifacts are committed**, never built at install time. No Node at deploy.

## Answer

**The workspace stands up and all three gates are green** — `pnpm build`,
`pnpm test` (13 tests), `pnpm typecheck` — committed as `17bfe45`. The Vite
half is `collective.fragmentsblock`'s, near-verbatim as instructed. **Two
departures from the template, both deliberate, and one of them changes what
ticket 15 has to build.**

### Departure 1: no facade stubs — the real `@plone/*` packages

The ticket said "vitest with `@plone/registry` and `@plone/helpers` aliased to
local stubs, as fragmentsblock does". **Done differently: neither is aliased.**

fragmentsblock stubs them on the premise that the facades "exist only in a
running host". That premise is false for these two. Both are published, and the
exact versions the host provides — `@plone/registry` **4.0.0-alpha.1** and
`@plone/helpers` **2.0.0-alpha.7**, read off `plone.blicca.auroraeditor`'s
`wrapper/package.json` — install in **154 packages** with no app stack behind
them. (Note fragmentsblock's own `@plone/registry` peer is `"*"`, which resolves
to `latest` = **2.7.3**, a version with **no `registerWidget`/`getWidget` at
all** — its stub is not a simplification of the host's registry, it is a
different object.)

Stubbing would have meant re-implementing the very resolution order this block
depends on — ticket 01's finding that `getWidget` searches all widget categories
flat is a property of the real class — so a bug in the stub reads as a passing
test.

**This paid off inside the hour.** Two facade divergences that the stub hid:

1. **`config.blocks.blocksConfig` does not exist on a bare registry.**
   `@plone/blocks`' install creates it (`config.blocks.blocksConfig = {}`, plus
   the four `config.blocks.widths`). Our `install()` threw on the first run.
   This is *why* the host's bootstrap order is blocks-before-cmsui, and
   fragmentsblock's stub — which pre-seeds `blocks: { blocksConfig: {} }` —
   would never have shown it.
2. **`getStyleFieldDefinitionsFromRegistry(fieldName, args)` takes `args` as a
   REQUIRED second parameter**, and `args` requires `data`. The stub declares it
   optional.

Neither would have surfaced before a live host.

### Departure 2: jsdom, not node

fragmentsblock uses `environment: 'node'` because it tests pure functions.
Tickets 07 (mount each widget), 08 (`edit`/`view`) and 15 (the harness) all
mount React, so the runner is `jsdom` with `@testing-library/react` available
from the start. `pnpm typecheck` is also added as a script — fragmentsblock has
none, and `tsc --noEmit` needed `@types/node` to pass on `vite.config.ts`.

### What "represent upstream, not Blicca" became

Since the registry is real, the local artifact is the **registration set**:
`test/upstream-registry.ts` exports `installUpstreamRegistry(config)`, a
transcription of `@plone/cmsui`'s `config/widgets.ts` (twelve registrations plus
`registerDefaultWidget`) and `@plone/blocks`' single `blockWidth`
`styleFieldDefinition`. The wrapper's seven overrides are absent on purpose, and
`BLICCA_ONLY_REGISTRATIONS` names them so a test asserts their absence by name
rather than by a bare `toBeUndefined()`. A field that only works because Blicca
registered `choices` fails here — which is the divergence ticket 02 asked this
suite to catch.

The widget components in the fixture are **named placeholders**, not the real
cmsui ones. See the consequence for ticket 15 below.

### Files

```
bundle-src/
  package.json          @derico/aurora-promo-block, exports ./src/index.tsx,
                        peers @plone/registry ^4.0.0-alpha.1 / @plone/helpers
                        ^2.0.0-alpha.7 / react ^18 || ^19
  pnpm-workspace.yaml   copied
  tsconfig.json         copied + `test` in include, types [node, vitest/globals]
  vite.config.ts        fragmentsblock's, renamed: promo-block.js, outDir
                        ../src/derico/blicca/promoblock/static
  vitest.config.ts      jsdom, no aliases
  build-plugins/scope-wrap.ts   copied unmodified
  test/upstream-registry.ts     Aurora's registrations and no more
  test/workspace.test.tsx       9 tests
  test/scope-wrap.test.ts       4 tests
  src/index.tsx                 walking skeleton
  src/styles.css                block root + one seam rule
  README.md
```

`pnpm-lock.yaml` is committed; `node_modules/` was already ignored.

### Verified, not assumed

- `pnpm build` emits `promo-block.js` / `.css` / `.js.map` into
  `src/derico/blicca/promoblock/static/`, **committed** (contract: artifacts are
  committed, never built at install time — there is no Node on the deploy host).
- The emitted CSS really is wrapped:
  `@scope (.aurora-editor, .aurora-editor-portal, .aurora-blocks-view) to (.aurora-pattern-island)`.
- The emitted JS imports `react/jsx-runtime` as a **bare specifier** — the
  externals are externals, and the automatic JSX runtime is in effect.
- **`assertNoSharedInBundle()` was proved to fire**, not merely present:
  dropping `react` from `SHARED_MODULES` and importing `useState` failed the
  build with the contract §2.1 message. Reverted. A guard that has never fired
  is not a guard.
- `transformCss` is tested directly on all four of its jobs (scope wrap, `@layer`
  flattening, `:root` → `:where(:scope)`, `@font-face` hoisting) — it is
  load-bearing for ADR 0006 and it is a pure function.
- The 3 existing Python tests still pass.

### Sandbox note

`pnpm install` needs `--store-dir /dev/shm/pnpm-store` here; the default store
hits a sqlite "disk I/O error". Recorded in `bundle-src/README.md`.

### Consequences for the map

- **Ticket 15 gains a decision it did not have.** Its body asks the harness to
  call the real `installTheming` / `installPlate` / `installBlocks` /
  `installLayout` / `installCmsui`. This ticket did **not** install those — the
  fixture transcribes cmsui's registration *list* with placeholder components.
  Adding the real installers means pulling the whole Aurora app stack
  (`@plone/cmsui` alpha.4 drags in `@plone/components`, quanta, emoji-mart,
  babel) into a block add-on's devDependencies, which is a real cost and not
  obviously right. The fixture is written so both roads stay open: every
  assertion ticket 15 needs is phrased in terms of *which key resolves*, so it
  survives swapping placeholders for the real components. **Ticket 15 must
  decide** whether the transcription is enough or the real installers are worth
  the dependency weight; noted on its body.
- **Ticket 12 is now unblocked** (it needed 05 and 06). The bundle it registers
  exists at the filename it expects: `promo-block.js`.
- **Ticket 08 inherits a walking skeleton**, not an empty directory:
  `install()`, `PromoBlockInfo` (no `defaultBlockWidth`, icon as a component,
  `title` a plain string) and placeholder `edit`/`view`/`blockSchema`, each
  marked with the ticket that replaces it.
- No new fog. Nothing here changed the destination or the scope.
