# Build: the editor half — `install`, `edit`, `view`

Type: build
Status: open
Blocked by: 03, 06, 07, 17

## Question

The React half, which is also the **public rendering in Aurora proper** — so
`view` is not a preview convenience, it is the block's other renderer.

- **`install(config)`** default export: registers the widgets (07), sets
  `config.blocks.blocksConfig.promo = PromoBlockInfo`, and **returns config** —
  the loader convention requires it. One record, one bundle, one `install()`.
- **`PromoBlockInfo`**: `id: 'promo'`, `title: 'Promo'` (a **plain string** —
  message descriptors degrade, i18n is contract §10 open work), `edit`, `view`,
  `blockSchema`, `icon` as a **React component** (a string breaks the slash
  menu), `category`. No `defaultBlockWidth`. Silent-drop gate: an entry missing
  a well-formed `id` or `title` vanishes from the menu with no error — check
  these two first if the block "doesn't appear".
- **`view`** emits the anatomy: `promo` / `promo-item` / `promo-image-wrapper` /
  `promo-content` / `promo-actions`, plus `has--align--<value>` **emitted by the
  component**, since `align` is a plain data field and no plugin stamps it.
- **`edit`** delegates to `view` (`<PromoView {...props} isEditMode />`), adding
  only editor-honesty placeholders — an empty state that says where to fill
  things in, rendered `contentEditable={false}` outside the block root. No field
  editing on the canvas.
- **Seeding defaults**: Aurora writes a node carrying only `@type`, and
  `blocksConfig` has no initial-data hook. If the block needs defaults, seed
  them in a ref-guarded `useEffect` via `onChangeBlock`, as `HeroEdit` does.
- **The click rule** implemented once and shared: any action label present ⇒
  actions are the links and the card link is inert; otherwise the card link
  wraps the whole promo. Never both.
- Tests: the conditional-schema branches from 03, the click rule in all four
  label/link combinations, and the anatomy classes — the last of which is what
  09 must match.

## Answer

<!-- fill in -->
