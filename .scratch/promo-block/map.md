# Wayfinder map: the Promo block — a generic Aurora block add-on

Labels: wayfinder:map
Status: needs-triage

## Destination

The **Promo block, built and working in two hosts**: an editor inserts it in
`@@aurora-edit`, fills in kicker, title, description, an optional image and up
to two calls to action, and the public Blicca view renders it — and the same
bundle, installed in Aurora proper, renders the same block from its own `view`
component without a Blicca wrapper anywhere.

Done means the block is installed and usable on the sandbox site **and** its
native-Aurora path has been exercised, not that a spec exists for it.

## Notes

- **This map carries execution.** The architecture is decided (see the ADR); the
  remaining decisions are small and the tickets run through to a built block.
- **Two repos, nearly.** The block is its own package
  (`derico.blicca.promoblock`); one token line lands in `plonetheme.derico`
  (ticket 16). Nothing lands in `plone.blicca.auroraeditor` — this block uses
  the contract as published and amends none of it.
- Skills per ticket type: `/grilling`, `/research`, `/plonecli` (scaffold and
  upgrade steps), `/tdd`.
- Vocabulary: [`CONTEXT.md`](../../CONTEXT.md) — **Promo block**, **kicker**, **card
  link**, **call to action**, **variant**, **image placement**, **theme seam**,
  **reference case**.
- Rationale: [ADR 0001](../../docs/adr/0001-the-promo-is-authored-not-referential.md)
  (authored, not referential) and [ADR 0002](../../docs/adr/0002-seam-defaults-live-at-their-point-of-use.md)
  (the seam declares no property; defaults live at their point of use).
- The mechanism is decided and implemented elsewhere: [the block add-on
  contract](../../../plone.blicca.auroraeditor/docs/design/aurora-block-addon-contract.md)
  + ADR 0013. Read it before touching packaging. Host `block_api` is **1.1**
  (`src/plone/blicca/auroraeditor/static/block-api.json`); the record declares
  `"1.0"`, the most permissive compatible declaration.
- The nearest worked template is **`collective.fragmentsblock`** — its
  `bundle-src/vite.config.ts`, `build-plugins/scope-wrap.ts`, `registry.xml`
  and `views/fragment_block_view.py` are copy-me files.

### Fixed constraints from the grilling session (2026-09-01, with md@derico.de)

- **The block is generic.** derico.de is its first consumer, not its subject.
  Every design-specific want goes through the [[theme seam]], never into the
  block's own rules.
- **`@type: promo`.** Not `teaser` (Aurora ships one; registration is last-wins
  by weight and would replace it silently) and not `highlight` (already a Plate
  text mark rendering `<mark>` in the same renderer).
- **Authored, never referential.** No target, no `overwrite`, no derived field.
  Reference semantics stay with Aurora's teaser.
- **Sidebar-only editing; the canvas is a preview.** No inline editing of any
  kind. Consequence accepted: the description is plain text — no bold, no
  inline links. The actions carry the links.
- **Working in Aurora proper is a requirement.** Aurora's sidebar registers one
  text control (a single-line input); `textarea`, `select`, `color_picker` and
  `choices` are declared with zero or Blicca-only implementations. The block
  ships its own widgets under **namespaced** keys (`promo_textarea`,
  `promo_select`, and — added by ticket 03 — `promo_link`) — claiming the generic
  `textarea` would silently change every other block's fields, which belongs
  upstream as a patch, not here as a side effect.
- **Two widget exceptions, taken deliberately.** `align` (cmsui registers
  `AlignWidget` upstream, with icons for exactly `left | right | center`), and
  the image field, **named `image` so field-id resolution hands it the host's
  own image widget** — registered in both hosts, upload included. This inverts
  `derico-hero`'s rule, which avoided the name to protect its own widget; here
  the host's widget is the thing we want. Comment it, or someone will "fix" it.
- **Stored keys are Aurora's, labels are the author's**: `head_title` / `title`
  / `description` on disk, "Kicker" / "Title" / "Description" in the sidebar —
  Volto's teaser makes the same split, and it keeps a teaser↔promo migration a
  rename-free copy.
- **Flat data keys, not `styles.*` nesting.** `align` is a plain data field, not
  a style field, mirroring Aurora's image block. Only `blockWidth` and
  `backgroundColor` are style fields, because the plugin machinery owns those.
- **Card link and calls to action are mutually exclusive at render.** Any action
  label present ⇒ the actions take the clicks and the card link is ignored, so
  no interactive element is ever nested in another. The field is offered only
  while both labels are empty; a value set earlier survives, hidden.
- **Nothing is `required`.** A half-authored promo saves and renders what it
  has — `derico-hero`'s rule.
- **No `defaultBlockWidth`.** The schema offers `blockWidth` instead; contract
  §1.4 makes declaring both a contradiction, and the two reference cases want
  different widths.
- **`backgroundColor` must be declared in our own schema.** The wrapper bolts it
  onto a hardcoded list — `['image','teaser','listing','video']` — which a new
  block is not on.
- **Cosmetics are custom properties, structure is CSS.** The block's sheet is
  `@scope`-wrapped and beats an unlayered theme rule at equal specificity
  (ADR 0006), so a theme restyling us with plain selectors loses. Rules are
  written by descent so generic inner names cannot collide with another add-on's
  — a habit from `derico-hero`.
  **Corrected by [ticket 04](issues/04-decide-the-theme-seam.md):** this bullet
  used to say properties are *declared on the block root*, carrying over
  `derico-hero`'s rule. That rule is right for hero's **private** composition
  values and wrong for a **seam** — a property declared on an element shadows the
  theme's inherited one, so declaring the default on `.promo` beats a theme's
  `:root` and forces exactly the specificity escalation the seam exists to
  prevent. Seam defaults therefore live at their **point of use**,
  `var(--promo-x, <literal>)`, and the block declares no `--promo-*` property
  anywhere. Genuinely private values still go on the block root, unpublished.
  Written up as [ADR 0002](../../docs/adr/0002-seam-defaults-live-at-their-point-of-use.md).
- **The markup exists twice** — a React `view` and a Chameleon template — and
  must emit identical anatomy classes, because one sheet dresses both surfaces.
  `align` being a plain data field means no plugin emits its modifier class;
  both components emit `has--align--<value>` themselves.
- **`path_of` mangles non-http schemes.** `urlparse("mailto:…").path` is truthy,
  so the scheme is stripped. Unlike the hero, this block **offers free-text
  links**, so this is its first case, not a latent one: the server renderer
  screens the value itself.
- Any GenericSetup profile XML change gets an upgrade step, even at `1.0.0a1` —
  `plonecli add upgrade_step`, narrowed to the affected import step.
- The `blicca_block_addon` copier template is contract §9 follow-on work and is
  **not built**. Scaffold with the stock `backend_addon` template and copy
  `collective.fragmentsblock`'s JS half.

## Decisions so far

<!-- one line per closed ticket: enough to judge relevance, then zoom the link -->

- [Research: does the host `image` widget behave in both hosts?](issues/01-research-image-widget-in-both-hosts.md)
  — **Assumption holds, reasoning corrected.** Field-id resolution wins and uses
  the *schema property key*; `config.getWidget` searches **all categories flat**,
  so both hosts' `widget: {image}` registration is found anyway. The value is
  always a bare string or `null` (Blicca relative `../resolveuid/<UID>`,
  upstream absolute `@id` **or free-text URL**). **Neither host persists
  `image_scales`/`image_field`** — ticket 10 is the sole source.
  `pattern_options` is ignored by the image widget in both hosts; no loss.
- [Research: how do we exercise the block in native Aurora?](issues/02-research-exercising-native-aurora.md)
  — **No live Aurora; verify against the unsubstituted upstream registry in
  vitest/jsdom.** Aurora *is* reachable (`plone/volto` branch `7-plate`,
  `apps/seven`; the network is open) but needs VHM domain-root serving and a
  monorepo source integration — off the critical path. Blicca is upstream **plus
  deltas**, of which `choices` and `backgroundColor`'s `styleFieldDefinition`
  (both Blicca-only) are the ones that touch the promo.
- [Decide: the Promo's content model and `blockSchema`](issues/03-decide-content-model-and-schema.md)
  — **Schema fixed verbatim; three host facts reshaped it.** (a) The schema
  function takes `{ formData }`, **not** `{ data }` — fragmentsblock's signature
  reads `undefined`, do not copy it. (b) `BlockSettingsFormRenderer` keys fields
  by **array index**, so a conditional field vanishing mid-fieldset makes React
  reuse one field's DOM node for another — hence **three fieldsets, each with
  exactly one conditional field, always last** (`align`, `card_link`,
  `backgroundColor`). The variant-follows-label conditional was **dropped**; it
  cannot be a tail. (c) **Neither host implements `allowExternals`**, so
  `object_browser` cannot express a `mailto:` — the three links are bare strings
  behind a new **`promo_link`** composite widget that looks up the host's own
  picker via `config.getWidget` rather than importing either (ticket 07 now ships
  three widgets). Also: `backgroundColor` **is** declared via fragmentsblock's
  `backgroundField()`, absent in Aurora by mechanism — **revisit if Aurora ever
  registers block backgrounds upstream**; nothing is seeded at insert time and
  both renderers carry the `button` / `center` / `default` fallbacks themselves;
  one scheme **allowlist** screens every author-typed link and image URL, spelled
  twice with paired parity tests.

- [Decide: the theme seam — which custom properties, and their defaults](issues/04-decide-the-theme-seam.md)
  — **Nineteen properties, literal defaults, declared nowhere.** Three premises
  corrected. (a) There are no Plone semantic tokens to reach through:
  barceloneta's 22 `--plone-*` are all chrome, the design-system spellings are
  **Clara's**, and where the two overlap they collide (`--plone-link-color` vs
  `--plone-color-link`) — so defaults are **literals, one level deep**, and a
  theme opts into its ladder by setting the property (which is all ticket 16 is).
  (b) `derico-hero`'s "declare on the block root" **breaks a seam** — a property
  set on an element shadows the theme's inherited one — so every default lives at
  its **point of use**, `var(--promo-x, <literal>)`, and the block declares no
  `--promo-*` anywhere. (c) The ground is **not ours**: `backgroundColor`'s
  `--aurora-block-bg-*` is a cross-block vocabulary and minting `--promo-bg` is
  the mistake; the `dark` slot's `(0,3,0)` rule outranks our `(0,2,0)` inks and we
  defer. Type **is** stated (`--promo-{kicker,title,description}-size`) because
  Aurora's preflight flattens headings; the CTA defaults to the system-colour pair
  `CanvasText`/`Canvas`. Growth: adding is minor, removing/renaming **and changing
  a default** are breaking — held by a README↔sheet lockstep test on ticket 11.

- [Build: scaffold `derico.blicca.promoblock`](issues/05-scaffold-the-package.md)
  — **Package exists, dev wiring green, prod pin deferred.** `plonecli create
  backend_addon` gave the browser layer, both profiles (uninstall
  `browserlayer.xml` mirrored `remove="True"`) and the
  `profile-plone.app.registry:default` dependency **for free** — the only
  pyproject edit was the `plone.blicca.auroraeditor>=1.0.0a2` floor. Docs moved
  in (`CONTEXT.md`, `docs/adr/`, this map under `.scratch/promo-block/`), all
  relative links rewritten and checked; a pointer README left in the site repo's
  `.scratch/promo-block/` because the move departs from
  `docs/agents/issue-tracker.md`. `mx.ini` + both site `pyproject.toml` places
  wired; 3 tests pass from the site root env. **`mx-prod.ini` is commented, not
  pinned** — the package has no remote and `gh` is absent, and a rev that exists
  only locally fails the deploy; a `--ini mx-prod.ini` deploy is therefore broken
  **until the repo is created, pushed and pinned** (checklist is in the file).
  Dev and tickets 06–17 are unaffected. Later tickets: scaffold ticket 09's view
  with `plonecli add view`, and every profile XML change needs
  `plonecli add upgrade_step`.

- [Build: the `bundle-src/` npm workspace](issues/06-build-the-js-workspace.md)
  — **Workspace green (build + 13 tests + typecheck); the facade stubs were
  dropped for the real packages.** fragmentsblock's Vite half is copied
  near-verbatim (`promo-block.js`, artifacts committed into `static/`), and
  `assertNoSharedInBundle` was **proved to fire**, not merely present. But
  `@plone/registry` **4.0.0-alpha.1** and `@plone/helpers` **2.0.0-alpha.7** —
  the host's own versions — are **installed for real, not aliased to stubs**:
  they pull no app stack (154 packages), and a stub would re-implement the
  resolution order the block depends on. It caught two divergences the stub hid
  — `blocks.blocksConfig` is created by `@plone/blocks`, not by a bare registry
  (hence blocks-before-cmsui), and `getStyleFieldDefinitionsFromRegistry` takes
  `args` as a **required** second parameter. Note fragmentsblock's
  `@plone/registry: "*"` resolves to 2.7.3, which has **no
  `registerWidget`/`getWidget`** — do not copy its stub. What stayed local is
  the *registration set*: `test/upstream-registry.ts` transcribes cmsui's twelve
  registrations plus `@plone/blocks`' lone `blockWidth`, with Blicca's seven
  overrides deliberately absent. vitest runs on **jsdom** (07/08/15 all mount
  React). Sandbox: `pnpm install --store-dir /dev/shm/pnpm-store`. **Ticket 15
  now has a decision to make** — whether to add the real `@plone/*` installers
  (Aurora app stack in a block's devDeps) or keep the transcription; noted on
  its body.

- [Build: `promo_textarea`, `promo_select` and `promo_link`](issues/07-build-the-two-widgets.md)
  — **All three built and registered; the picked-link storage corrected.** A
  picked item is stored as **`../resolveuid/<UID>`, not the brain's `@id`** —
  Blicca's `apiPath` is `portal.absolute_url()`, so an `@id` bakes the deploy
  hostname into content; `BliccaImageWidget` already converts this way, and
  doing it here makes the two hosts **converge** instead of diverging as this
  ticket had pre-accepted (extracted as `storedLinkFor()`, which names the
  shape ticket 09 must resolve). Three host facts shaped the rest: the sidebar
  renderer passes **neither `id` nor `value`** — so the widgets mint their own
  control id (the Blicca reference widgets' `htmlFor={props.id}` associates
  nothing) and the text surfaces are **uncontrolled** off `defaultValue`, as
  upstream's `TextField` is; and the sidebar portals out of Plate's
  `afterEditable` slot as a **sibling** of the `Editable`, so no key guard is
  needed and adding one would only break document-level listeners. Two
  improvements on `BliccaChoicesWidget`: an unset select shows the schema
  `default` without storing it, and an off-list stored value keeps its own
  option. `promo_link` mounts the host's picker only while its Browse
  disclosure is open, ignores empty selections, and disappears entirely where
  no `object_browser` is registered — the picker is an affordance, never a
  gate. Screening stays at render (Q7). **Note for ticket 11:** the block's
  scope-wrapped sheet cannot reach the sidebar in Aurora proper, so these
  widgets carry the host's Tailwind metrics instead — do not dress them from
  the block stylesheet.

- [Build: the image serialization transformer pair](issues/10-build-image-transformer.md)
  — **Built (31 tests); three injected keys, not two, and the brain is a lucky
  accident.** `image_scales` + `image_field` alone are unrenderable — a promo has
  no `@id` to hang the entries' relative `download` off — so **`base_path` is
  stamped into every scale entry** (the full site path, the form Blicca's helpers
  join, *not* `plone.volto`'s portal-relative spelling) and a third key
  **`image_url`** is injected, always usable as an `<img src>`. Its **absence**
  is the signal for "no image": a dangling reference resolves to `("", None)`
  rather than the raw string, so a deleted picture draws the no-image layout
  instead of a guaranteed 404. Resolution composes `path2uid` (which follows
  renames through the redirection storage, free) with `resolve_uid`, covering all
  four stored forms plus upstream's legacy dict/list shapes. **The finding to
  carry:** `resolve_uid` returns a brain only because an Image's primary field is
  `INamedBlobImageField` → `INamedImageField`, *not* `INamedFileField`, so
  restapi's `PrimaryFileFieldTarget` misses; had it applied, every promo would
  silently lose its scales — and that adapter is **inert for anyone who can
  edit**, so it would have shipped green and broken for visitors alone (pinned by
  an anonymous test). Excluding the links **survives on a corrected reason**:
  ticket 07 made them bare `resolveuid` strings, not `@id`-carrying objects, and
  ticket 09 already owns the resolve-or-emit call. Proved by mutation, not
  assertion: unregistering the deserializer fails 5 tests — necessary because
  restapi's own generic deserializer pops `image_scales` from every block dict at
  order 1 and knows nothing of the other two keys. **Ticket 08 gained a note**: a
  freshly picked image carries no derived keys until the next load, and
  upstream's `getPreviewSrc` cannot bridge it.

- [Build: static resource, registry record, upgrade step](issues/12-build-registration.md)
  — **Installed; the gate chain is green on the running site and the Promo is
  in the slash menu.** The record is exactly as specified (no `permission` —
  the block is generic), `plone:static` publishes `++plone++`, and uninstall
  mirrors it. Three corrections to the ticket's assumptions. (a) The scaffolded
  upgrade handler was **dropped**: `reload_gs_profile` re-imports every step of
  the default profile on a live site, so 1001 is an `upgradeDepends` on a
  one-file mini profile with `import_steps="plone.app.registry"` —
  `plonetheme.derico`'s 1006 shape. Stated honestly: that narrowing has **no
  observable effect today** (the uninstall handler is a no-op), so its test
  asserts the registered step, not behaviour. (b) `plonecli` leaves the new
  upgrade profile **installable from the add-ons control panel**, where
  installing it would import the XML without moving the default profile's
  version — added to `HiddenProfiles`, with a test that enumerates
  `listProfileInfo()` so the next scaffolded step cannot ship visible. (c) The
  registry copy under `1001/` is a **forced duplicate**, held identical to the
  default profile by a parsed-XML test. Live: install → 204 at version 1001,
  both artifacts 200, `@@aurora-edit` emits both busted URLs, `/` lists
  **Promo** after `Teaser` (Aurora's own teaser not displaced), no console
  errors. **Carry to ticket 09:** installing now raises the wrapper's
  soft-lockstep warning on every edit-page render (`no aurora-block-promo
  renderer view`) — expected, and itself proof the record survived every gate,
  since `lockstep_gaps` only walks survivors. 42 tests pass; every guard was
  mutation-checked.

- [Decide: the anatomy class list both renderers emit](issues/17-decide-anatomy-classes.md)
  — **Twelve classes, one flat prefixed namespace, and the block owns its root.**
  `.promo` is the component's own `<div>`, never the host's `.block-promo`
  stamp — the Promo's reason is not the hero's measured breakout but that **it
  has two hosts** and Aurora's stamp is unverifiable here. Inner elements are
  `promo-<noun>`, which **departs from `derico-hero` deliberately**: hero's bare
  `kicker`/`button` are justified by mockup diffability, a rationale a generic
  block does not have, and `--promo-kicker-color` already sets the vocabulary.
  Descent discipline is kept regardless — it, not the prefix, is what stops
  collision. Three rules make the two renderers agree: `has--align--<value>` is
  emitted **always** and carries the *effective* placement (settling both awkward
  Q8 rows at once, and removing the need for any image-presence class); the empty
  promo is **exactly one element**, containers are never emitted empty; and the
  card link is a **wrapper** `<a class="promo-cardlink">` rather than a root that
  changes tag — the stretched-link overlay was rejected because it makes the
  stylesheet load-bearing for clickability, which is the one thing ticket 04
  hands themes power over. `<div>` root (not `<section>`: no nameless regions),
  `<h2>` title, and the image is always `<picture>` + `<img>` on both surfaces so
  09's `image_source()` branch is invisible to the sheet. Variant is
  `promo-cta-button`/`promo-cta-link`, **not** `has--variant--` (that shape means
  plugin machinery, which `align` has upstream and the variant does not); **no
  slot class**, because primary/secondary name appearance, not order.
  **Overrides ticket 08's provisional list** — `promo-item` and
  `promo-image-wrapper` do not exist, `promo-content` is now `promo-copy`.
  Corrected in passing: this ticket's own "properties are declared on the block
  root" bullet was stale (ADR 0002). Unblocks 08 and 09.

- [Build: the editor half — `install`, `edit`, `view`](issues/08-build-editor-half.md)
  — **Built (158 vitest tests), and it hands ticket 09 a fixed target instead of
  a peer.** The canvas preview rule — the one decision the ticket carried — is
  `image_url` first, then a **resolveuid reference plus `/@@images/image/large`
  left relative** (verified: `resolveuid` is `plone.outputfilters`'
  `ResolveUIDView`, which *collects* its subpath and 301s — unlike
  `plone.app.uuid`'s view, which overwrites the uid with each segment), then a
  site-relative path or an absolute URL under `config.settings.apiPath` (the
  branch that makes a just-picked image preview in **Aurora**), then any other
  http(s) URL **whole**. No `srcset`: `w` descriptors without a `sizes` policy
  the block cannot know would over-fetch. **One divergence, stated:** ticket 10
  reads a missing `image_url` as "the picture is gone", which the canvas cannot
  tell from "picked one second ago", so the canvas previews optimistically and
  self-corrects — the renderers agree on every node the server has serialized,
  which is what parity claims. Three decisions the ticket left implicit:
  **nothing is seeded**, so the `useEffect`/`onChangeBlock` mechanism it
  described is absent entirely (Q5, pinned by a throwing writer prop); **no
  anchor carries an `href` in the canvas**, because a live one on the card-link
  wrapper makes the whole block a navigation target and the author cannot select
  what they are editing (⇒ **ticket 11 must never select on `[href]`**); and
  **Q8 row 8 is subsumed** — a link failing the Q7 screen is treated exactly as
  an absent link, since "as text, no href" would emit a `.promo-cta` ticket 17's
  table forbids and restore the dead button row 2 removes. The editor half is
  *only* honesty: `.promo-incomplete` names the empty slots (Q5 seeds nothing,
  so a fresh promo would be a blank box) and `.promo-notice` announces every
  value the renderers drop — which is what makes Q8's silence acceptable on the
  public page. Delivered for 09 and 11: **`tests/anatomy-cases.json`**, 23
  hand-authored cases at the package root read by *both* suites, compared
  exactly (attribute order normalized away — React writes `src` last, which is
  its business and not a Chameleon template's) and as a **skeleton** (classes
  only), so 09 can emit a real ladder and still be held to the anatomy. Ticket
  17's "Aurora's wrapper stamp is unverified" flag is **partly closed**:
  upstream's own `TeaserBlockView` emits its own root and applies neither
  `className` nor `style`, so owning the root is upstream's shape, not a Blicca
  bet. **Not verified: the live canvas** — Plone is not running here, and that
  claim belongs to 13/14/15 anyway. Every guard mutation-checked, with a
  passing no-op control.

- [Build: the server half — `@@aurora-block-promo`](issues/09-build-server-half.md)
  — **Built (200 Python tests, vitest's 158 still green); resolution was made
  href-bearing but not anatomy-bearing.** Three open questions answered. (a) A
  picked link **is** resolved server-side (`resolve_uid` + `path_of`) rather
  than emitted for the public `resolveuid` view — the stored
  `../resolveuid/<UID>` is *document*-relative and lands somewhere different at
  every depth — but a **dangling** reference comes back unchanged and the action
  still renders, **deliberately unlike ticket 10's dangling-image rule**: a
  missing picture changes the layout so the renderers must agree, a dead link
  changes only where the click goes. Scheme safety is then structural, not a
  guard — `RESOLVEUID_RE` cannot match `mailto:`/`tel:`, so they never reach
  `path_of`. (b) `image_url` is the single source **and** the single gate;
  screening it is what covers the image field's free-text surface, since ticket
  10 emits an external URL whole. (c) **This ticket's own `image_source()`
  instruction is superseded by ticket 17**: `None` no longer means "emit no
  `<picture>`" but "no scale-derived ladder", the element being unconditional on
  both surfaces; what the promised surface adds is intrinsic `width`/`height`,
  and **no `srcset`**, for ticket 08's reason (no `sizes` policy a generic block
  can know) which holds identically on the server. The template is authored
  readably and `__call__` collapses `>\s+<` — sound rather than approximate,
  because every value is stripped by `promo_data.text` and escaped by Chameleon,
  so the only bare angle brackets are structural. `promo_data.py` is the
  Plone-free twin of `data.ts`, and `TestScreenParity` reads the TS literals
  (Python-reads-TS) after first proving its parser found something. **22 of 23
  fixture cases match exactly**, not merely as skeletons, with the exemption
  list a denylist so new cases default to strict. Ticket 12's soft-lockstep gap
  is closed in-process via `lockstep_gaps`; **not verified live — Plone is not
  running here**, which is 13/14's job regardless. **Ticket 11 gained a note**:
  the server's `<img>` carries `width`/`height` only when scales resolved and
  the canvas's never does, so the sheet must size `.promo-image` itself.

- [Build: one scope-wrapped stylesheet for both surfaces](issues/11-build-the-stylesheet.md)
  — **Built, verified on the running site, and one published default corrected
  because the site proved it dead.** `--promo-cta-hover-bg`'s
  `color-mix(… CanvasText 88%, black)` computes to `oklab(0 0 0)` — `CanvasText`
  already IS black — so the UNTHEMED button had no hover feedback at all, the
  dead button the property was invented to prevent, reached from the other end.
  Now mixed towards `var(--promo-cta-fg, Canvas)`, which cannot degenerate
  because the ink contrasts with the fill by construction, and copper still
  darkens; **a breaking default change**, taken only because nothing is
  released. The other eighteen were read off `/Plone` anonymously with every
  `--promo-*` unset, which is the bare-host case ticket 04 asked for. One grid
  for all three placements (`right` reverses the TEMPLATE, so
  `--promo-image-width` always names the image's track); the narrow collapse is
  a **container** query at 34rem — the canvas column and the published page are
  different widths at one viewport — and had to be written on the CHILDREN at
  (0,3,0), because a container cannot query itself and the obvious `.promo > *`
  spelling would have lost to the wide `right` rules and collapsed only one
  placement. Three declarations are parity statements, not looks: `margin: 0`
  (Barceloneta pads, preflight zeroes), `white-space: normal` (Plate's
  `pre-wrap` inherits in) and sizing the `<img>` from the sheet (only the server
  carries intrinsics). The ticket's open question — dress the editor's chrome? —
  is **yes, in literals only**: it is the editor talking to the author, and a
  theme must not be able to hide a nag. Held by two new suites, both
  mutation-checked with passing controls: `seam-lockstep.test.ts` fails in five
  directions (undocumented, unconsumed, drifted, fallback-less, DECLARED) with a
  recursive paren-balanced parser because the hover default nests a `var()`; and
  `sheet-selectors.test.tsx`, which catches the *silent* failure nothing else
  covers — sheet and renderers agree by NAME only, and ticket 17 renamed
  `promo-content` late. Flagged rather than taken: **no `--promo-cta-padding`**
  (a literal), and the title is weight 600 under Barceloneta but **body weight
  in Aurora** — ticket 04 states size only. The README is now the block's
  published contract instead of plonecli boilerplate. Unblocks 13, 14 and 16.

- [Verify: reference case A — the image-less centred band](issues/13-verify-reference-case-imageless.md)
  — **Expressible, on both surfaces, with nothing the block lacks — and the dark
  slot corrected the README on its way through.** The band is the fixture's 24th
  case, so both renderers are held to it; a new authorability block in the
  schema suite says an *author* could have typed it (and that Aurora proper
  offers no ground, so the native case A is an unbanded promo); and
  `test_reference_case_band.py` runs the only test of the whole publishing
  pipeline — `render_blocks`, transforms, wrapper stamp, renderer — asserting
  the block is the wrapper's only child, the `mailto:` survives it, a picked
  reference resolves **beside** the mailto in the same render, and a visitor
  gets the identical string. Live on `/Plone/promo-band-probe`: markup, metrics
  and sidebar round-trip all as specified, zero console errors. Two README
  corrections the site forced: the flattening rule names `[data-slate-editor]`
  too (canvas and page flatten **alike**), and the button's inversion is not the
  system-colour pair but the same flattening — **`--promo-cta-fg` is inert on
  the `dark` slot** while `--promo-cta-bg` passes through, so the seam can take
  the fill back and never the ink. One honest surface difference found rather
  than assumed: the title is weight 600 published and 400 in the canvas, now
  stated in the README as the price of not scope-locking weight. Handed on: the
  host image widget renders **unlabelled** (ticket 14), and the three-property
  token line with its dark-slot caveat (ticket 16).

- [Verify: reference case B — image beside the copy](issues/14-verify-reference-case-image-left.md)
  — **The picture path is whole; the image FIELD is the host's, in two ways.**
  Both placements survive as authored (case A is always `center`, so only a case
  with a picture can show this), the container-query collapse fires for `left`
  AND `right` at 538.5px inline, a picked reference and an **uploaded** file both
  land and round-trip with scales, and a deleted target degrades to the centred
  no-image layout without throwing. Held by the fixture's 25th case — the one
  combination nothing else reached, a card link with a picture and no action
  labels — and by `tests/test_reference_case_image.py`, the only place ticket
  10's transformer and a renderer run in ONE call (unregistering the serializer
  fails 12 of its 23). **Ticket 13's unlabelled image field is worse than
  reported and is not ours**: `BliccaImageWidget` declares a `value` prop it
  never reads, so the control is write-only — no label, and no sign of which
  picture is chosen — identically for every image field in both hosts; decided
  to report upstream rather than wrap it, which would cost the host's upload.
  And the README's "the title's weight is the only place the surfaces differ" is
  **corrected**: a replaced picture is stale in the canvas until save, and a
  deleted one diverges structurally (the page centres, the canvas keeps the
  placement and 404s). Both documented; the decision they raise is ticket 19.

- [Verify: the block works in Aurora proper](issues/15-verify-native-aurora.md)
  — **Exercised against the registry Aurora actually builds, and the old
  fixture turned out to be unable to fail.** Ticket 06's choice went to the
  **real installers**, on an argument sharper than fidelity: the assertions
  this fixture exists for are assertions of ABSENCE (`choices`, `textarea`,
  `select`, `backgroundColor`), and against a transcription each passes
  *because we chose not to transcribe them* — restating the fixture's own
  construction, unable to fail while the hypothesis is false. That hypothesis
  is exactly ticket 02's stated risk. Cost measured, not feared: 154 → ~670
  packages, **devDeps only**, raw-TS packages that vitest transforms with no
  build step; the shipped artifact is byte-identical and now holds its own
  line (four imports, all promised externals). **The finding, caught by
  mutation and not by reading: every `choices` absence assertion in the suite
  was vacuous.** `registerWidget` stores a bare component AS the category
  (`widgets.choices = Component`), and `getWidget` skips it on its
  `typeof === 'object'` guard — so `getWidget('choices')` returns `undefined`
  whether or not it is registered, while `Field.tsx` reads `widgets.choices`
  directly. Latent since ticket 06; fixed at all four sites behind
  `choicesWidgetOf()`. **A boundary the placeholders had hidden:** cmsui's
  `ImageWidget` (`useFetcher`) and `ObjectBrowserWidget` (`useLoaderData`)
  cannot be MOUNTED outside Aurora's edit route — ADR 0009 recorded only the
  picker half, the image half is new — so two of the four upstream
  resolutions are asserted rather than exercised, and `widgets.test.tsx`'s
  picker tests now supply a stand-in. Ticket 02's two predicted divergences
  are both **closed by design** (03's explicit `widget` outranks `choices`;
  08's own ladder never calls `getPreviewSrc`) and pinned so a refactor cannot
  reopen them. Newly assertable because the installers are real: the promo
  joins Aurora's four blocks **without displacing the teaser**, and `view`
  reads nothing from the registry — strip every registration and the markup is
  byte-identical, which is why the two hosts cannot diverge there. Incidental:
  `@plone/registry`'s config is **frozen**; the hygiene regex ignored bare
  side-effect imports. Cost that landed: `tsc` follows the installers into raw
  source that does not compile outside Volto's monorepo, so eight specifiers
  are `paths`-mapped to a documented shim for **type** resolution only. The
  README states the bounded claim — *built against upstream-registered widgets
  and its own*, **not** *verified in Aurora* — and absorbs ticket 11's two
  notes.

## Not yet specified

- **Whether the title needs a twentieth property in Aurora.** Ticket 11 found
  the title is weight 600 under Barceloneta and **body weight in Aurora** —
  the seam states type SIZE only, and Aurora's Tailwind preflight resets
  headings — so 1.75rem at body weight is the whole of the title's
  distinction there. The fix, if it is one, is `--promo-title-weight`, which
  ticket 04's growth policy allows as a minor addition because the axis
  already exists. It stays fog rather than a ticket because the question is
  *does it read as broken*, and [ticket 15](issues/15-verify-native-aurora.md)
  established that nothing here can see Aurora render: no Seven app is stood
  up, and that is out of scope below. Graduates the first time someone looks
  at a real Aurora page.

## Out of scope

- **Standing up a live Aurora (Seven) against this backend.** Settled by
  [ticket 02](issues/02-research-exercising-native-aurora.md). It is *possible* —
  `plone/volto` branch `7-plate`, `apps/seven`, and the network is open — but it
  needs VHM domain-root serving (Seven flattens URLs against `apiPath`) plus a
  monorepo source integration, because contract §4's runtime add-on loader is a
  Blicca mechanism Aurora has no counterpart for. That is an environment
  project, not a promo-block decision. The destination asks for the
  native-Aurora path **exercised**, and the vitest/jsdom harness against the
  unsubstituted upstream registry does exercise the shared seam
  (`install`/`edit`/`view`). The residual gap is stated honestly in the README
  rather than closed.

- **Reference semantics.** If the block should ever pull a target's title and
  image, that is Aurora's teaser growing actions and placement, contributed
  upstream — not this block growing an `href`.
- **Rich text in the description.** Would mean a nested Plate lane inside a void
  node: re-solving focus, selection and undo. `derico-hero` declined it and so
  do we.
- **Turning derico's contact band into content.** It stays a chrome pagelet: it
  is deliberately identical on every page, and authoring it per page would lose
  it the first time someone forgot. The band is a [[reference case]], not a
  migration target.
- **Fixing `textarea` for the whole ecosystem.** Registering the generic key
  would repair Aurora's own teaser description everywhere. Good idea, wrong
  vehicle — upstream patch, not a side effect of installing this block.
- **Labelling the host's image widget, or showing its current value.** Found by
  [ticket 14](issues/14-verify-reference-case-image-left.md): `BliccaImageWidget`
  declares a `value` prop and never reads it, and the sidebar drops the schema's
  title, so the control is write-only and unnamed — in both hosts, for every
  block that takes an image. Wrapping it in a `promo_image` would cost the
  host's upload, which is the whole reason the field is named `image`. Upstream
  report, not a promo change — the same shape as the `textarea` bullet above.

- **Fixing `path_of`.** Four existing call sites, one an external-video URL.
  This block screens its own links; changing the shared helper is Blicca's call.
