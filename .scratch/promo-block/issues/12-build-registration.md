# Build: static resource, registry record, upgrade step

Type: build
Status: resolved
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

**Installed, and the whole gate chain is green on the running site — the block
is in the slash menu.** Three premises the ticket carried needed correcting or
sharpening; the record itself is exactly as specified.

### What landed

- `profiles/default/registry.xml` — one `IAuroraBlockAddon` record under
  `plone.blicca.auroraeditor.blockaddons/derico.blicca.promoblock.promo`:
  `bundle` and `css` pointing at the two committed `++plone++` artifacts,
  `block_api` `"1.0"`, `types` `['promo']`, `enabled` True, `weight` 100, and
  **no `permission`** — this block is generic and for every editor, unlike
  `plonetheme.derico`'s hero.
- `profiles/uninstall/registry.xml` — the `remove="true"` mirror, in lockstep
  with the browser layer the same profile already removed.
- `configure.zcml` — `<plone:static name="derico.blicca.promoblock" type="plone"
  directory="static"/>`.
- `upgrades/1001` — scaffolded with `plonecli add upgrade_step`, then narrowed
  (below). Profile version 1000 → 1001; `metadata.xml` was never hand-edited.
- Tests: `test_setup.py` grew from 3 to 9, `test_upgrade_step_1001.py` replaced
  wholesale with 5. **42 pass**, ruff clean.

### The upgrade step is `upgradeDepends` only — the scaffolded handler was dropped

`plonecli` generates a `v1001.py` calling `reload_gs_profile`, which
re-imports **every step of the default profile** on a live site: browser layer,
rolemap, catalog. Version 1001 adds one registry record and nothing else, so
the step is the declarative shape `plonetheme.derico`'s 1006 already uses — an
`upgradeDepends` on a mini profile carrying one file, plus
`import_steps="plone.app.registry"` to narrow it once more. Without
`import_steps`, `UpgradeDepends.doStep` calls `runAllImportStepsFromProfile`,
and a step whose file is merely **absent still runs its handler** — so an
upgrade would re-run this package's own uninstall step.

`upgrades/base.py` went with the handler: nothing imported it any more, and
`plonecli` regenerates it the moment a future step needs it.

**Honest about that narrowing test:** it asserts on the *registered step*
(`step.import_steps`), not on an observable effect, because there is no
observable effect **yet** — today's `uninstall()` is `pass` and the other
import steps are file-driven. Dropping `import_steps` was mutation-tested and
changed no behaviour. It is a guard against a handler that grows teeth later,
and the assertion is the only way to hold it now.

### The registry copy under `1001/` is a deliberate duplicate

The default profile is what a **fresh install** imports; the mini profile is
what a **site at 1000** imports; GenericSetup gives no way to point the second
at the first. So the copy stays, and `test_upgrade_registry_matches_the_default_profile`
compares both files' parsed structure (ElementTree drops comments, so the prose
may differ freely) — the copy cannot drift.

### The scaffold left the upgrade profile installable — a defect, now fixed

`genericsetup:registerProfile` makes `derico.blicca.promoblock.upgrades:1001`
an EXTENSION profile, and `plonecli` does **not** add it to `HiddenProfiles`.
Unhidden, it shows up in the add-ons control panel as a separately installable
product; installing it there imports the XML **without moving the default
profile's version**, leaving the site recorded as older than it is.
`plonetheme.derico` lists all six of its upgrade profiles for exactly this
reason. Added — and `test_every_upgrade_profile_is_non_installable` enumerates
`listProfileInfo()` against the hidden list, so the next scaffolded step fails
the suite instead of shipping visible.

### Verified on the running site (localhost:8081, after a restart)

The `plone:static` node is ZCML, so the instance had to be restarted; it was
also stale for ticket 10's transformer subscribers.

1. **Record present** — install returns 204, `@addons` reports
   `installedVersion: "1001"`.
2. **Bundle resolves** — `++plone++derico.blicca.promoblock/promo-block.js`
   → 200 `text/javascript` (6755 b), `.css` → 200 `text/css`.
3. **Block-api compatible** — `@@aurora-edit` emits both cache-busted
   `++webresource++.../++plone++derico.blicca.promoblock/...` URLs; a record
   failing any gate is omitted entirely, so their presence *is* the gate result.
4. **Block appears in the slash menu** — typing `/` in the editor on
   `debug-article` lists **Promo**, between `Fragment` and `Derico Hero` and
   **after `Teaser`**, confirming Aurora's own teaser was not displaced. Zero
   console errors. Nothing was inserted or saved; the WebDAV lock was released
   and the article's `modified` date is unchanged.

### The finding to carry — ticket 09 now has a visible symptom

Installing raises the wrapper's soft-lockstep warning, once per edit-page
render:

> `Aurora block add-on 'derico.blicca.promoblock.promo' registers editor block
> 'promo' but no aurora-block-promo renderer view is registered; public pages
> will render it as block-unrendered.`

This is **correct and expected** — ticket 09 owns that view — and it is also
proof the record survived every gate, since `lockstep_gaps` only runs over
surviving statuses. It clears when 09 lands, and it is the cheapest way to
check 09 from the server side.

### Two smaller notes

- **`weight` 100 ties with `plonetheme.derico.hero`.** Registration order is
  (weight asc, record name asc), so `derico.blicca.promoblock.promo` loads
  first. Harmless, and matches the menu order observed. Nothing to change; just
  do not read `weight: 100` as "unordered".
- **The record is installed on the sandbox site now**, so ticket 13/14's
  reference cases have a site to be authored on the moment 08/09/11 land.

