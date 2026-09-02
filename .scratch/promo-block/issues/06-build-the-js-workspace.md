# Build: the `bundle-src/` npm workspace

Type: build
Status: open
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

<!-- fill in -->
