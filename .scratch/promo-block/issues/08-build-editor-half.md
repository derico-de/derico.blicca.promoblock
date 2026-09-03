# Build: the editor half — `install`, `edit`, `view`

Type: build
Status: resolved
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
- **`view`** emits the anatomy — **now fixed verbatim by
  [ticket 17](17-decide-anatomy-classes.md), which supersedes the provisional
  list this bullet used to carry** (`promo` / `promo-item` /
  `promo-image-wrapper` / `promo-content` / `promo-actions`). Three of those
  changed: `promo-item` and `promo-image-wrapper` **do not exist**, and
  `promo-content` is now **`promo-copy`**. Build against 17's table, not this
  bullet. `has--align--<value>` is still **emitted by the component** — `align`
  is a plain data field and no plugin stamps it — but it carries the *effective*
  placement and is emitted **always**, including on an image-less promo
  (`has--align--center`).
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


**Note from [ticket 10](10-build-image-transformer.md): a freshly picked image
has no scales until the next load.** The three derived keys (`image_scales`,
`image_field`, `image_url`) arrive with the restapi serialization, so a promo
*loaded* from the server carries them — but when the author picks a new image
in the sidebar, the node is patched client-side with the bare string alone.
Blicca's node-patching side channel that would fill them in gates on
`@type === 'image'` (ticket 01), so for `promo` it never fires.

So the canvas cannot render the just-picked image from `image_url`, and it
cannot use upstream's `getPreviewSrc(url) = url.startsWith('/') ? url +
'/@@images/image/<size>' : url` either — Blicca stores `../resolveuid/<UID>`,
which does not start with `/` and would be emitted as a raw, broken `src`
(ticket 01 §5.1 flagged the same helper for the same reason). The canvas needs
its own preview rule over the raw `image` string, with the derived keys as the
richer path when they happen to be present. Decide it here; the public
renderer is unaffected, since ticket 10 runs before every server render.

## Answer

Built. **158 vitest tests** (up from 44), typecheck and build green, 42 Python
tests still passing, and every guard below was **mutation-checked** — the
control mutation (a whitespace-only edit) correctly passed, so the failures
are the assertions and not the runner.

Files: `src/promo/{data.ts,schema.ts,PromoView.tsx,PromoEdit.tsx,PromoIcon.tsx}`,
`src/index.tsx` rewired, and `tests/anatomy-cases.json` at the package root —
a **shared fixture ticket 09 reads too** (see below).

### The canvas preview rule — the one decision this ticket carried

`imageSrc()` in `src/promo/data.ts`, in order:

1. **ticket 10's `image_url`**, when present. A promo *loaded* from the server
   always carries it, for an in-site picture and a free-text external one
   alike.
2. a **resolveuid** reference ⇒ append `/@@images/image/large` and **leave the
   value relative**. Verified, not assumed: `resolveuid` is
   `plone.outputfilters`' `ResolveUIDView`, registered `for="*"`, and its
   `publishTraverse` **collects the remaining subpath** and 301s to
   `<target>/@@images/image/large`. (Note `plone.app.uuid`'s
   `RedirectToUUIDView` does **not** — it overwrites `self.uuid` with each
   segment. Do not reason from that one.) Blicca's own `ImageWidget` documents
   the same conclusion for the image block.
3. a **site-relative path**, or an absolute URL **under
   `config.settings.apiPath`** ⇒ same suffix. This is the branch that makes a
   just-picked image preview in **Aurora proper**, whose image widget stores an
   absolute `@id`. `apiPath` is a `@plone/types` `Settings` field, so it is the
   one host-provided value both hosts are known to carry.
4. any other **http(s)** URL ⇒ emitted **whole**. Appending `@@images` to an
   external picture is a guaranteed 404.

Everything passes the Q7 image screen (relative, http, https) first, so
`mailto:` typed into the image field draws the no-image layout.

**No `srcset` is built from `image_scales`, deliberately.** `w` descriptors
without `sizes` default to `100vw` and over-fetch, and `sizes` depends on
`blockWidth` and the theme's layout — neither of which this component can
know. The public page's ladder is ticket 09's; adding a `srcset` here later is
additive and invisible to the sheet.

**One divergence, stated rather than hidden.** Ticket 10 makes the *absence* of
`image_url` its signal for "the picture is gone". The canvas cannot tell that
apart from an image picked one second ago — both are `image` set with no
derived keys — and step 2 resolves the ambiguity in favour of the common case.
So a promo whose target was deleted keeps a `.promo-image` in the canvas until
the next load. The two renderers still agree on **every node the server has
serialized**, which is what anatomy parity is a claim about; the window is
editor-only and self-correcting. It is in the fixture as
`image-dangling-reference`, carrying both expectations and the reason. For the
same reason `warnings()` does **not** cry "dangling" — it would fire on every
fresh pick.

### Three further decisions the ticket left implicit

**1. Nothing is seeded, so the whole seeding mechanism is absent.** The ticket
described a ref-guarded `useEffect` calling `onChangeBlock`, as `HeroEdit`
does. Ticket 03 Q5 had already ruled seeding out — a generic block has no copy
that is right for every site — so `PromoEdit` takes no writer prop at all. Its
absence is the decision, not an omission, and a test passes a throwing
`onChangeBlock` to prove nothing calls it.

**2. No anchor carries an `href` on the editor surface.** A live `href` on the
card-link **wrapper** makes the *entire block* a navigation target in the
canvas, so the author cannot click to select the thing they are editing; on an
action it throws away unsaved work. `linkProps()` drops the attribute in edit
mode and changes nothing else — element, tag and class list are identical, so
the stylesheet cannot tell the surfaces apart. **Ticket 11 must therefore never
select on `[href]`.** (`derico-hero` ships live hrefs on its CTAs; a
whole-block card link is a different order of hazard, so this block departs.)

**3. Q8 row 8 is subsumed, not implemented as written.** It says a link failing
the Q7 screen renders "as text, no `href`". Ticket 17's class table then made
`.promo-cta` conditional on "a label **and** a screened link", so the text-only
shape would emit an element the anatomy says cannot exist — and would put back
the dead button row 2 exists to remove. A failed screen is therefore treated
**exactly as an absent link**: the action renders nothing, the card-link wrapper
is not emitted, and the **canvas names it**. Rows 2, 3 and 8 collapse into one
rule, spelled once in `action()`.

### The editor half is honest, and that is all it is

`edit` renders `<PromoView {...props} isEditMode />` and adds two things, both
**outside the block root** and `contentEditable={false}` (ticket 17 rule 3
keeps the root empty, so neither could live inside it):

- **`.promo-incomplete`** — `missing()`, the labelled skeleton. Q5 seeds
  nothing, so without it a fresh promo is a blank box.
- **`.promo-notice`** — `warnings()`, one sentence per value the renderers
  drop. **This is what makes Q8's silent resolutions acceptable**: every row
  that discards something an author typed is announced here and nowhere else —
  a half-filled action either way round, a link that fails the screen, a card
  link the labels have orphaned, an `align` with no image left to place, and an
  image value that is not a picture.

A half-filled action counts as *present* rather than *missing*, so it lands in
the notices where the sentence can say what is wrong with it.

### The shared anatomy fixture — what this hands ticket 09

`tests/anatomy-cases.json` (package root, beside `src/` and `bundle-src/`):
**23 hand-authored cases**, each a stored node plus the exact markup, written
from ticket 17's class table and ticket 03's Q8 table. Ticket 17 said 09's test
is now "a test against a fixed list rather than against whichever ticket landed
first" — this is that list, and both suites read the same file.

Two comparison levels, both derived from the one hand-authored `html` so there
is no second field to drift:

- **exact**, up to attribute *order* — React writes an `<img>`'s `src` last on
  purpose, which is its implementation detail and has no business in a fixture
  shared with a Chameleon template, so each suite sorts attributes first.
- **skeleton** — the markup with every attribute but `class` removed, text
  kept. This is the **cross-renderer contract**: it lets ticket 09 emit a real
  resolution ladder in its `<img>` while still being held to this anatomy.

The editor expectation is `html` with every `href` removed, and nothing else —
which is how decision 2 above is pinned rather than merely described.

Also written twice on purpose: the fixture cases *and* a hand-written
structural section asserting the table directly (the twelve classes and no
others, the tags and why, no element ever emitted empty, `has--align--` always
present and always singular, no image-presence class, the root's tag and class
list invariant across the card-link states, and the click rule in all
combinations). A fixture regenerated from the code could not quietly redefine
the table.

### One flag of ticket 17's, partly closed

17 recorded that **Aurora's wrapper stamp is unverified** (no `@plone/cmsui` in
the checkout, no live Aurora per ticket 02), which is why the block owns its
root. The *convention* is now verified even if the class list is not:
**upstream's own `TeaserBlockView` emits its own `.teaser-item` root and applies
neither the `className` nor the `style` prop** that `BlockViewProps` declares.
So a block `view` that owns its root and ignores those props is upstream's own
shape, not a Blicca-only bet — and `PromoView` deliberately spreads neither.

### What is NOT verified here

The live canvas. Plone is not running in this session (`localhost:8081` refuses),
and starting it is not mine to do — so "the Promo renders in `@@aurora-edit`" is
still a claim on this ticket, backed by jsdom rather than a browser. It belongs
to **ticket 13/14** (reference cases, blocked on the stylesheet) and **ticket
15** (native Aurora), which is where it was always going to be settled. The
build's `assertNoSharedInBundle` did run and pass, so the one failure mode that
would break the canvas silently — a second React in the bundle — is excluded.

### Guards, mutation-checked

| mutation | result |
|---|---|
| whitespace-only edit (control) | 15 pass — the runner is not the thing failing |
| `align` moved off its fieldset's tail | 2 fail |
| click rule keyed on *rendering* actions instead of labels | 5 fail |
| `href` kept on the canvas | 1 fail |
| `promo-copy` emitted unconditionally | 14 fail |
| `has--align--` carries the stored, not effective, placement | 4 fail |
| the Q7 allowlist turned into a `javascript:` blocklist | 4 fail |
| `promo-copy` renamed back to 08's provisional `promo-content` | 36 fail |
| title demoted to `<h3>` | 30 fail |
| card-link wrapper dropped | 9 fail |
| ticket 10's `image_url` ignored | 10 fail |


## Note from [ticket 17](17-decide-anatomy-classes.md) (2026-09-03)

The anatomy is settled; this ticket implements it rather than deciding it.
Four consequences for the React half specifically:

- **The root is the component's own `<div class="promo">`**, not the host's
  `.block-promo` wrapper — which matters most here, because Aurora's wrapper
  stamp is unverified (no `@plone/cmsui` in the checkout, no live Aurora per
  ticket 02). Owning the root makes that irrelevant.
- **The card link is a wrapper**, `<a class="promo-cardlink">` *outside* the
  root — not a root whose tag changes to `<a>`. The click rule this ticket
  already owns therefore chooses between emitting that wrapper and emitting
  `.promo-cta` anchors, and `.promo`'s tag and class list never vary.
- **The image is always `<picture class="promo-image"><img></picture>`**, even
  on this surface where there are never any scales — the server half's
  `<picture>`-vs-`<img>` branch must be invisible to the stylesheet.
- **Every element is conditional on its own content.** An empty promo is
  `<div class="promo has--align--center"></div>` and nothing else; the editor
  skeleton nag stays outside the block root, as this ticket already specifies.
