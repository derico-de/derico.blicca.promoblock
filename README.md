# derico.blicca.promoblock

An Aurora **Promo block** — an authored promo card with a kicker, a title, a
description, an optional image and up to two calls to action.

The block is **generic**. derico.de is its first consumer, not its subject:
every design-specific want goes through the theme seam below, never into the
block's own rules.

It is **authored, never referential** (ADR 0001): there is no target, no
`overwrite` and no derived field. Reference semantics stay with Aurora's own
teaser.

## Two hosts, one markup

The Promo renders from two renderers that emit the **same anatomy**:

- a React `view` — the public rendering in Aurora proper, and the canvas
  preview in `@@aurora-edit`;
- a Chameleon template, `@@aurora-block-promo` — the public rendering under
  Blicca.

One scope-wrapped stylesheet dresses both. An element added to one renderer
without a peer in the other is a bug in both, and the fixture suite in
`tests/anatomy-cases.json` — 25 states, read by the Python and the vitest
suites alike — is what says so.

### Anatomy

```html
<a class="promo-cardlink">                          <!-- only when the card link is active -->
  <div class="promo has--align--<effective>">
    <picture class="promo-image"><img …></picture>  <!-- only with an image -->
    <div class="promo-copy">                        <!-- only if anything inside it renders -->
      <p  class="promo-kicker">…</p>
      <h2 class="promo-title">…</h2>
      <p  class="promo-description">…</p>
      <div class="promo-actions">                   <!-- only if an action renders -->
        <a class="promo-cta promo-cta-button">…</a>
        <a class="promo-cta promo-cta-link">…</a>
      </div>
    </div>
  </div>
</a>
```

Every element is conditional on **its own** content, and containers are never
emitted empty — an empty promo is exactly one element. `has--align--<value>` is
emitted **always** and carries the *effective* placement, so an image-less promo
is `center` whatever was stored.

`block`, `block-promo`, `has--block-width--<value>` and
`has--backgroundColor--<value>` arrive from the host on the wrapper **outside**
this block's root. The block never emits them.

### Choosing the picture

The `image` field is deliberately named `image` so field-id resolution hands it
**the host's own image widget** — registered in Blicca and in Aurora proper,
upload included. Owning the name means inheriting the widget's shape, and one
part of that shape surprises people:

- **It carries no label and shows no current selection.** In the sidebar the
  field is a bare "Select or upload" button between Description and Image
  placement; the schema's `title` never reaches it, and the widget declares a
  `value` prop it never reads, so an author cannot see *which* picture is
  chosen — only the canvas says. This is the widget's own shape in both hosts,
  identical for every block that takes an image, so the Promo leaves it alone:
  wrapping it would mean re-implementing the upload, which is the one thing
  naming the field `image` was chosen to avoid. Report it upstream, not here.

Only the reference is stored. Everything renderable about the picture —
`image_url`, `image_scales`, `image_field` — is **derived on load** by the
block's serializer and stripped again on save, so none of it is ever on disk.
A fourth derived key, `image_ref`, carries the reference the other three were
derived *from*; that is what lets the canvas tell a derived set that is about
the picture the author has now from one describing the picture they just
replaced, without the editor ever writing to the document. The rules that
follow from it, in author-visible terms:

- A picture you have just chosen previews **immediately**, through the
  reference itself — including one that replaces a picture already there.
- A picture whose target has been **deleted** stops being drawn as soon as the
  promo is reloaded: the block reflows to the no-image layout the visitor
  already gets, and the canvas says so in a notice.
- No derived key is ever offered in the sidebar, and typing one into the JSON
  is pointless: the next save discards it.

### Where the two surfaces really differ

One, measured on a running site, and it is not cosmetic drift: **the title's
weight**, for the reason under "Not themeable, on purpose". A picture whose
target was deleted used to be the other entry — the canvas kept previewing a
reference that 404s while the page showed no picture at all — and `image_ref`
closed it: both surfaces now draw the same no-image layout for it. The page a
visitor gets is always the server's regardless.

## What "works in Aurora" means here

The block is **built against upstream-registered widgets and its own**, and
every field it declares resolves in Aurora to the widget it was designed for.
That is the claim — deliberately narrower than "verified in Aurora".

What is actually exercised, in `bundle-src/test/aurora-harness.test.tsx`: the
registry Aurora builds, from the packages Aurora ships
(`@plone/theming`, `@plone/plate`, `@plone/blocks`, `@plone/layout`,
`@plone/cmsui`), installed in the host's own order, at the versions this host
pins — and with **none of the Blicca wrapper's overrides**. The block's
`install`, `edit` and `view` run on top of it. The registry differences are
what a promo can actually trip over, so they are what is covered: `align`
resolves to cmsui's own `AlignWidget` and `image` to its `ImageWidget`
(asserted by object identity, not by name), no field falls through to the
default single-line input except the four that are meant to, and the promo
joins Aurora's four blocks without displacing the teaser.

What is **not** covered, stated plainly:

- **No Seven app is stood up.** That needs VHM domain-root serving and a
  monorepo source integration, and the runtime add-on loader this block is
  delivered by is a Blicca mechanism Aurora has no counterpart for. So nothing
  here proves the block renders in a real Aurora page — only that it resolves
  and renders against the registry Aurora builds.
- **Two upstream widgets cannot be mounted outside Aurora's edit route.**
  cmsui's `ImageWidget` calls `useFetcher` and its `ObjectBrowserWidget` calls
  `useLoaderData`; both throw in any harness. They *resolve* here, and in
  Aurora they mount inside the edit route, where Aurora's own teaser picks its
  target the same way. `promo_link` therefore looks the picker up through
  `config.getWidget` rather than importing one, and disappears entirely where
  no picker is registered.
- **Nothing dresses the block there.** The stylesheet is `@scope`-wrapped to
  `.aurora-editor`, `.aurora-editor-portal` and `.aurora-blocks-view` — roots
  that exist in Blicca and nowhere in Aurora proper. A headless suite can hold
  reachability (every selector matches markup a renderer emits) but not
  appearance. The editor's `.promo-incomplete` / `.promo-notice` chrome is
  undressed there too, which is survivable only because it is prose.
- **The title is body weight in Aurora** and 600 under Barceloneta, because
  the seam states type size only and Aurora's preflight resets headings. See
  "Not themeable, on purpose".

Two divergences were predicted for Aurora and both turned out to be closed by
design rather than merely tolerated — pinned as tests so a refactor cannot
quietly reopen them. A field leaning on `choices` would degrade to a text
input, because only Blicca registers that widget; the two fields that declare
`choices` carry an explicit `widget` instead, which outranks it. And a
Blicca-stored `../resolveuid/<UID>` would reach the DOM as a raw `src` through
upstream's `getPreviewSrc`; the block never calls it, resolving previews with
its own ladder instead.

## Theming: the seam

The block publishes **nineteen custom properties**. They are its whole styling
interface: a theme sets properties, never rules.

Set them where they **inherit** into the block — `:root`, or the theme's own
scope root. Never on `.promo`, and never with a plain rule: the block's sheet is
`@scope`-wrapped, so at equal specificity a scoped declaration wins on scope
proximity and a theme rule would have to escalate specificity to be heard.

The defaults are **literals, one level deep** — no `--plone-*`, no `--clara-*`,
no `--aurora-*`. `--plone-*` is not one vocabulary but two that collide
(`plonetheme.barceloneta`'s `--plone-link-color` against `plonetheme.clara`'s
`--plone-color-link`, neither aliasing the other), and on native Aurora there is
no Plone CSS at all, where a missing token would make the declaration
invalid-at-computed-value-time and collapse the block instead of leaving it
neutral. A theme opts into its own ladder by *setting* the property —
`--promo-title-size: var(--plone-text-2xl)` — which is the seam working as
designed.

**The block declares none of these properties anywhere.** Each default lives at
its point of use as `var(--promo-x, <literal>)`, so a theme's `:root` value
inherits in and wins with no escalation. See
[ADR 0002](docs/adr/0002-seam-defaults-live-at-their-point-of-use.md), and
`bundle-src/test/seam-lockstep.test.ts`, which fails if this table and the
stylesheet ever disagree.

### The property table

| property | default | what it paints |
|---|---|---|
| `--promo-gap` | `2rem` | image column ↔ copy column |
| `--promo-flow` | `0.75rem` | rhythm *within* the copy stack, including between the two actions |
| `--promo-padding` | `0` | inner padding of the block root |
| `--promo-measure` | `60ch` | max width of the copy |
| `--promo-border` | `none` | border on the block root |
| `--promo-radius` | `0` | corner radius of the block root |
| `--promo-image-width` | `1fr` | the image's grid track at `left` / `right` |
| `--promo-image-ratio` | `auto` | `aspect-ratio` of the image box |
| `--promo-image-radius` | `0` | corner radius of the image |
| `--promo-kicker-size` | `0.875rem` | kicker type size |
| `--promo-kicker-color` | `currentColor` | kicker ink |
| `--promo-title-size` | `1.75rem` | title type size |
| `--promo-description-size` | `1rem` | description type size |
| `--promo-link-color` | `currentColor` | the `link` variant, and the card link |
| `--promo-cta-bg` | `CanvasText` | the `button` variant's fill |
| `--promo-cta-fg` | `Canvas` | the `button` variant's ink |
| `--promo-cta-hover-bg` | `color-mix(in oklab, var(--promo-cta-bg, CanvasText) 88%, var(--promo-cta-fg, Canvas))` | button fill on hover |
| `--promo-cta-radius` | `0.375rem` | button corner radius |
| `--promo-cta-border` | `none` | button border |

Notes on the ones that were argued:

- **`--promo-padding` defaults to `0` on purpose.** The host's background slot
  already pads the band with `--aurora-space-block`, so a non-zero default would
  double-pad every banded promo. Turn it on together with a border or a ground.
- **`--promo-measure` is forced, not optional.** A `center` promo at
  `blockWidth: full` would otherwise run the copy across the whole bleed.
- **`--promo-image-ratio` defaults to `auto`, never a ratio**, because forcing
  one crops the author's image by default.
- **`--promo-image-width` is a grid track**, so `1fr`, `22rem` and `40%` all
  work; `1fr` gives equal columns.
- **`--promo-cta-hover-bg` derives from whatever the theme set**, so a theme
  that sets only the fill does not end up with a dead button. It mixes towards
  the button's own **ink** rather than towards black, because the ink contrasts
  with the fill by construction: mixing towards black is a no-op on the default
  `CanvasText` fill, which already is black in a light colour scheme.
- **`--promo-cta-border` exists** because a fill and an ink together cannot
  express a ghost button.

### Growth policy

- Adding a property is a **minor** release.
- Removing or renaming one is **breaking**.
- **Changing a default is also breaking.** A theme that set nothing is relying
  on the default, so a default is a published value and not an implementation
  detail. This is the clause most likely to be forgotten, which is why the
  lockstep test exists.
- A property may only be added for an axis that **already exists in the
  markup**. A new axis needing new anatomy is an anatomy decision first.

### There is no background or foreground property

Deliberately, and as a rule rather than by omission. The ground is the host's:
the `backgroundColor` style field makes the *wrapper* paint a full-bleed band
from `--aurora-block-bg-*`, which is a **cross-block** vocabulary. A block that
needs a ground uses the generic name. Minting `--promo-bg` is the mistake — two
grounds for one block is the defect, and a promo on a band gets the band from
the wrapper, correctly full-bleed.

### Two documented interactions

1. **The promo goes monochrome on the `dark` background slot.** Blicca ships
   `:is(.aurora-blocks-view, [data-slate-editor]) .block.has--backgroundColor--dark :where(*) { color: inherit }`
   at (0,3,0) and this block's inks are (0,2,0), so on that slot **every colour
   the seam sets** — the kicker, the link variant *and the button's ink* — is
   flattened to the band's foreground, whatever the theme set it to. That rule
   is deliberate upstream; the block defers to it rather than escalating
   specificity to win. It names the editor too, so the canvas flattens
   identically — the surfaces agree here rather than diverging.
2. **On that slot the button keeps its fill and loses its ink.** A background is
   not a colour, so `--promo-cta-bg` passes through untouched while
   `--promo-cta-fg` is flattened with everything else and is simply inert there.
   With nothing set, the `CanvasText` default fill is black — on a dark band, a
   black slab wearing the band's light ink: legible, but a shape nobody chose.
   Setting `--promo-cta-bg` takes the fill back, and it is the only half of the
   button the seam can reach on this slot.

### Not themeable, on purpose

- **The placement switch.** `center` stacks and centres, `left` and `right` are
  two columns. Wanting a different one means wanting a different block.
- **The title has one size, not one per context.** A promo standing in for a
  full-width section band wants a larger headline than a promo used as a card,
  and `--promo-title-size` is a single inherited value that cannot express
  both. The block is dressed as a **card** — a block an author drops on a page
  — and a page-scale headline is what the page's own `h1` is for. If the band
  case is ever authored for real, the fix is a second property
  (`--promo-title-size-full`, read under `.block.has--block-width--full`), an
  additive **minor** change that leaves `1.75rem` where it is; it is not a
  ramp inside the block, and it is not a theme rule. Decided in
  `.scratch/promo-block/issues/20-decide-promo-title-scale-axis.md`, which
  carries the citations and the one constraint that matters: only `full` is
  expressible on both surfaces.
- **The focus ring.** The block sets no `outline` at all, so the host's
  `:focus-visible` reaches the CTA unopposed. A property here would be a seam
  over something that was never blocked.
- **Type weight, leading and transform.** Only the three `--promo-*-size`
  properties are published. Stating a weight or a leading would scope-lock it
  with no property to recover it; the block is deliberately quiet rather than
  quietly unrecoverable. The visible consequence, measured on a running site:
  the title is the theme's `h2` weight on the published page (600 under
  Barceloneta) and the editor's body weight in the canvas, because Plate's
  preflight flattens headings. It is the price of not scope-locking the
  weight, and since `image_ref` closed the other one it is the only place the
  surfaces do not look identical — see
  "Where the two surfaces really differ".

### Where the two-column placements collapse

`left` and `right` fall back to the stacked `center` layout below **34rem** of
the block's own inline size. It is a **container** query, not a media query: the
editor canvas column and the published page are different widths at the same
viewport, and a viewport query would get the canvas wrong.

## Installation

Add `derico.blicca.promoblock` to your project's dependencies:

```python
# In your pyproject.toml
dependencies = [
    "derico.blicca.promoblock",
]
```

Then install the add-on from Plone's control panel, or apply the
`derico.blicca.promoblock:default` GenericSetup profile.

## Development

The Python half and the JavaScript half are built separately, and the JS build
output is **committed** into `src/derico/blicca/promoblock/static/` — Node is a
packaging-time tool here, never an install-time one.

```bash
# JavaScript: widgets, schema, edit/view, the stylesheet
cd bundle-src
pnpm install
pnpm test
pnpm typecheck
pnpm build        # writes ../src/derico/blicca/promoblock/static/promo-block.{js,css}
```

The five Aurora installers are **devDependencies**, so the test registry is the
one Aurora actually builds rather than a transcription of it (see "What 'works
in Aurora' means here"). They cost nothing at runtime — the shipped bundle
imports four modules, all of them promised externals, and a test fails if that
ever stops being true. They ship raw TypeScript and do not typecheck outside
Volto's monorepo, so `tsconfig.json` maps them to `test/aurora-packages.d.ts`
for **type** resolution only; vitest still loads the real packages.

```bash
# Python: run from the assembly repo's root environment
uv run --no-sync pytest sources/derico.blicca.promoblock
```

Any GenericSetup profile XML change gets an upgrade step, even in an alpha:
`plonecli add upgrade_step`, narrowed to the affected import step.

## License

GPL-2.0-or-later

## Author

Maik Derstappen <md@derico.de>
