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

## Not yet specified

<!-- empty: the property surface — the last patch of fog — graduated into
     ticket 04 and is now settled. Nothing in scope remains unspecifiable. -->

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
- **Fixing `path_of`.** Four existing call sites, one an external-video URL.
  This block screens its own links; changing the shared helper is Blicca's call.
