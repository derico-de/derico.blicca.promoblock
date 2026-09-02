# Build: static resource, registry record, upgrade step

Type: build
Status: open
Blocked by: 05, 06

## Question

Make the built artifacts discoverable per site, in lockstep with the renderer.

- **`<plone:static name="derico.blicca.promoblock" type="plone" directory="static"/>`**
  — `++plone++`, **never** `++resource++`. Two URLs for one JS module means two
  Reacts.
- **One `IAuroraBlockAddon` record**, prefix
  `plone.blicca.auroraeditor.blockaddons/derico.blicca.promoblock.promo`:
  `bundle` → `++plone++derico.blicca.promoblock/promo-block.js`,
  `css` → the scope-wrapped sheet, `block_api` → `"1.0"` (host is 1.1;
  compatible iff same major and host minor ≥ declared), `types` →
  `['promo']`, `enabled` → True, `weight` → 100. No `permission` — this block
  is for every editor, and the insert gate fails open anyway.
- **Uninstall profile** mirrors the record with `remove="true"` and the browser
  layer with `remove="True"`. Install and uninstall must stay in lockstep with
  the renderer's layer, or content renders as `block-unrendered`.
- **An upgrade step for every profile XML change**, even at `1.0.0a1`:
  `plonecli add upgrade_step`, narrowed to the affected import step. Never
  hand-edit `metadata.xml`'s version.
- Copy `collective.fragmentsblock`'s `registry.xml` and
  `plonetheme.derico`'s — the latter is the best-annotated example in the tree
  and explains the per-block-record rule (one shared bundle would break per-record
  `enabled`).
- Verify the whole gate chain on the running site: record present → bundle
  resolves → block-api compatible → block appears in the slash menu.

## Answer

<!-- fill in -->
