# Decide: the anatomy class list both renderers emit

Type: grilling
Status: resolved
Blocked by: 03

## Question

Fix the exact list of class names the Promo's markup carries, so the React `view`
(08) and the Chameleon template (09) emit **identical** anatomy and the single
scope-wrapped stylesheet (11) has one set of selectors to dress.

### Why this is its own ticket

Surfaced while resolving ticket 03 (Q9). The map requires the markup to exist
twice and emit identical anatomy classes, because one sheet dresses both
surfaces — but **no ticket owned the list**. Tickets 08 and 09 were blocked only
by 03, so they could run in parallel, each invent its own names, and the second
to land would have to reverse-engineer the first. 08 and 09 are now blocked by
this ticket instead.

It is deliberately *not* folded into ticket 03: class names are not the content
model, and they are not the stylesheet either (11 consumes them, transitively
blocked through 08 and 09). They are the parity contract between three tickets,
which is what earns them their own resolution.

### Settled already, and constraining

- **`align` is a plain data field, not a style field** (ticket 03), so no plugin
  emits its modifier class. **Both components emit `has--align--<value>`
  themselves**, and that symmetry is the thing the tests must hold.
- **Style fields do get plugin-stamped**: `blockWidth` and `backgroundColor` are
  resolved by StyleFieldsKit into inline custom properties plus a
  `has--<field>--<value>` class on the block wrapper, and the classic renderer
  stamps the same pair while walking the tree. Do not emit those by hand — know
  which classes are ours and which arrive for free.
- **Rules are written by descent.** ~~and custom properties are declared on the
  block root~~ — **corrected 2026-09-03**: descent is right and is kept, but the
  property half is stale. [Ticket 04](04-decide-the-theme-seam.md) / ADR 0002
  established that seam defaults live at their **point of use** and the sheet
  declares no `--promo-*` anywhere; a declaration on the root would shadow the
  theme's inherited value and break the seam.
- Ticket 03's Q8 table fixes what is *present* in each partial state; this
  ticket fixes what those present elements are *called*.

### Open here

- **The names themselves**, for: the block root, the media box, the image, the
  copy column, the kicker, the title, the description, the action row, each
  action, and whatever the card-link wrapper becomes when the whole promo is
  clickable.
- **The card-link case specifically.** When both action labels are empty and
  `card_link` is set, the whole block is wrapped in one `<a>` — is that an extra
  element around the root, or does the root itself become the `<a>`? The two give
  the stylesheet different work and only one keeps the root's class list stable.
- **How `has--align--<value>` interacts with the image-less case.** An image-less
  promo stores no `align` and falls back to `center` at render (ticket 03, Q5) —
  does it still emit the modifier, or nothing? Both renderers must agree, and the
  first reference case is exactly this shape.
- **Whether the empty block still carries the full root class list** — Q8's first
  row says it does; confirm what "anatomy classes" means there precisely.
- **The naming convention itself**: BEM-ish descent (`promo__title`), plain
  descent (`promo` then `title`), or something the surrounding stack already
  uses. Check what `derico-hero` and `collective.fragmentsblock` actually emit
  before inventing a third dialect.

Write the resulting list into the answer verbatim, as the table 08, 09 and 11
build against.

## Answer

Settled by grilling with md@derico.de on 2026-09-03, in two rounds. Nine
questions; every recommendation was taken. The table below is normative for
tickets 08, 09 and 11.

### The dialect

**One flat, prefixed namespace descending from the block's own root.**

- **The block emits its own root, `.promo`** — never the host's `.block-promo`
  wrapper stamp. `derico-hero` set this precedent for a measured reason (the
  wrapper is the full-bleed box on the public page but only the column box in
  the canvas); the Promo's reason is different and simpler: **the wrapper is the
  host's, and this block has two hosts.** Blicca's `plate.py::_block_attrs`
  stamps `block block-promo has--block-width--<w>` — verified — but no
  `@plone/cmsui` is installed in this checkout and ticket 02 established there
  is no live Aurora, so **Aurora's stamp is unverified**. A block that owns its
  root does not care.
- **Inner elements are prefixed `promo-<noun>`, flat, never BEM.** This
  deliberately **departs from `derico-hero`**, which uses bare generic names
  (`kicker`, `lede`, `action-row`, `button`, `quiet-link`) protected only by
  descent. The hero's stated reason is *mockup diffability* — its sheet and
  `docs/design/derico.de/site/assets/site.css` stay comparable line for line —
  and that rationale **does not transfer to a generic block** that ships to
  sites which have no mockup. Two further reasons: the seam vocabulary is
  already `--promo-kicker-color` / `--promo-title-size`, so `promo-kicker` reads
  consistently with the README table ticket 11 must write; and a theme author
  reading DevTools should be able to tell at a glance which classes belong to
  this add-on. No BEM `__`: nothing in this stack uses it consistently
  (`home-hero__grid` is a mockup leftover, not a convention).
- **Descent discipline is kept in full.** Every rule in ticket 11's sheet
  descends from `.promo`. The prefix is belt; descent is braces. Both hero and
  promo sheets are `@scope`-wrapped to the *same three roots* and coexist on one
  page, so descent is what actually prevents collision — the prefix only makes
  the ownership legible.

### The element tree, verbatim

Both renderers emit exactly this. Square brackets mark conditional elements;
every element is conditional on **its own** content.

```html
<a class="promo-cardlink">                              <!-- only when the card link is active -->
  <div class="promo has--align--<effective>">
    <picture class="promo-image"><img …></picture>      <!-- only with an image -->
    <div class="promo-copy">                            <!-- only if anything inside it renders -->
      <p  class="promo-kicker">…</p>
      <h2 class="promo-title">…</h2>
      <p  class="promo-description">…</p>
      <div class="promo-actions">                       <!-- only if an action renders -->
        <a class="promo-cta promo-cta-button">…</a>
        <a class="promo-cta promo-cta-link">…</a>
      </div>
    </div>
  </div>
</a>
```

### The class table

| class | element | present when |
|---|---|---|
| `promo` | block root, a `<div>` | **always** |
| `has--align--<value>` | on the block root | **always**; the *effective* placement (see below) |
| `promo-cardlink` | an `<a>` **wrapping** the root | both action labels empty **and** `card_link` set and passing the Q7 screen |
| `promo-image` | a `<picture>` containing one `<img>` | an image resolves |
| `promo-copy` | a `<div>` | any of kicker, title, description or actions renders |
| `promo-kicker` | a `<p>` | `head_title` is non-empty |
| `promo-title` | an `<h2>` | `title` is non-empty |
| `promo-description` | a `<p>` | `description` is non-empty |
| `promo-actions` | a `<div>` | at least one action renders |
| `promo-cta` | an `<a>`, one per rendering action | that slot has **both** a label and a screened link |
| `promo-cta-button` | second class on `.promo-cta` | that slot's effective variant is `button` |
| `promo-cta-link` | second class on `.promo-cta` | that slot's effective variant is `link` |

### Arriving for free — do not emit these

Stamped by the host on the **wrapper**, outside our root. Verified in
`plate.py::_block_attrs` (lines 428–456):

- `block` and `block-promo` — always.
- `has--block-width--<value>` — always, from the `blockWidth` style field.
- `has--backgroundColor--<value>` — **only when non-default**; an unstyled block
  carries no such class at all. Plus `is-background-continuation` between
  adjacent blocks sharing a background, which is the host's business entirely.

`has--align--<value>` is **ours**, because `align` is a plain data field and no
plugin stamps it (ticket 03). It is the one place we borrow the host's
`has--<field>--<value>` shape, and it is legitimate because Aurora's image block
stamps `align` upstream in exactly this spelling.

### The rules that make the two renderers agree

**1. The `align` modifier is always emitted, and carries the *effective*
placement, never the stored value.**

One sentence settles both awkward rows of ticket 03's Q8 table at once:

- image-less promo (no `align` ever stored) → `has--align--center`
- `align: "left"` stored, image later cleared → `has--align--center`
- image present, no `align` → `has--align--center`
- image present, `align: "left"` → `has--align--left`

Emitting it only when an image is present was rejected: it adds a second
condition the two renderers must agree on independently, for no gain, and it
would give ticket 11's sheet two selector families where one does.

**2. No image-presence class is needed, and none is emitted.** An image-less
promo always resolves to `center`, and a promo *with* an image at `center` wants
the same stacked layout minus the picture — so `has--align--center` plus the
presence or absence of `.promo-image` distinguishes every case the sheet has to
tell apart.

**3. The empty promo is exactly one element.**

```html
<div class="promo has--align--center"></div>
```

wrapped by the host as
`<div class="block block-promo has--block-width--default" …>`. Ticket 03's Q8
row 1 — "block root with its anatomy classes, empty inside" — means the **root
and its modifier, and nothing else**. Structural containers are *not* emitted
empty: `promo-copy` and `promo-actions` are conditional on their own content
exactly as `hero.pt`'s `tal:condition`s are. Ticket 08's canvas nag is already
specified as living **outside** the block root, so nothing needs an empty
container to hang off.

**4. The card link is a wrapper, not a root that changes tag.** Of the three
candidates —

| | shape |
|---|---|
| chosen | `<a class="promo-cardlink"><div class="promo">…</div></a>` |
| rejected | the root itself becomes `<a class="promo">` |
| rejected | a `position: absolute; inset: 0` overlay inside the root |

the wrapper keeps `.promo`'s **tag and class list invariant across every state**,
which is precisely the parity this ticket exists to buy. Making the root's tag
conditional would force both renderers to agree on a branch at the single
element the whole stylesheet hangs off. The stretched-link overlay is the more
idiomatic card pattern but makes the **stylesheet load-bearing for
clickability** — and ticket 04 hands themes power over exactly that, so a theme
touching `position` on the root would silently break the link with nothing to
catch it.

Never both a wrapper and an action link: the Q8 rule stands unchanged, so no
interactive element is ever nested in another.

### Tags, and why

- **Root is a `<div>`, not a `<section>`.** A `<section>` with no accessible
  name adds a nameless region to the accessibility tree. `derico-hero` earns its
  `<section>` as a single page-level brand element; a promo is one of several in
  a page's flow, and four nameless regions is worse than none.
- **Title is an `<h2>`.** Volto's teaser does this, `derico-hero` puts a real
  `<h1>` in its block, and a promo that never enters the document outline is
  invisible to anyone navigating by heading. The block cannot know its true level
  wherever it is inserted; `<h2>` is the honest guess. Rule 3 means an empty
  title emits no heading at all, so there is no empty-heading hazard.
- **Kicker and description are `<p>`.** The description is plain text by
  decision (sidebar-only editing, ticket 03), so there is nothing richer to
  express.
- **The image is always a `<picture>` wrapping one `<img>`**, on both surfaces,
  including the no-scales fallback — exactly as `HeroMedia.tsx` and `hero.pt`
  do. This makes ticket 09's `<picture>`-vs-plain-`<img>` branch (`image_source()`
  returning `None`) **invisible to the stylesheet**, and the React half — which
  never has scales — emits the same element. There is **no wrapper box**:
  `--promo-image-ratio` goes on the `<img>` with `object-fit: cover`, and
  `--promo-image-width` is a grid track on `.promo`, so neither seam property
  needs one.

### The variant, and why not `has--`

`promo-cta-button` / `promo-cta-link` as a **second class alongside
`promo-cta`**.

- Not `has--variant--button`: that shape belongs to the host's style-field
  plugin machinery. `align` borrows it legitimately because Aurora's image block
  stamps that exact spelling upstream; the variant has no counterpart anywhere,
  so borrowing the shape would advertise plugin involvement that does not exist.
  The faithful spelling would anyway be
  `has--cta-primary-variant--button`, keyed on the field id.
- Not `is-button`: the dialect ruled out bare generic names, and
  `collective.fragmentsblock`'s `block-fragment` + `block-fragment-unresolved` is
  the local precedent for a prefixed second class.
- Both renderers apply ticket 03's Q5 fallback themselves — **variant absent ⇒
  `button`** — so `promo-cta-button` appears on a slot that stores no variant.

**No slot class.** `promo-cta-primary` / `promo-cta-secondary` were rejected:
`CONTEXT.md` is explicit that "primary" and "secondary" name *appearance, not
order*, and appearance is already fully carried by the variant class. A slot
class hands themes a hook to style by slot, quietly reintroducing the ranking
that ticket 03's deliberately symmetric field ids were chosen to prevent. DOM
order gives `:first-child` to anyone who genuinely needs position.

### Corrections this ticket carries

1. **Ticket 08's provisional list is overridden.** It named
   `promo` / `promo-item` / `promo-image-wrapper` / `promo-content` /
   `promo-actions`. `promo-item` and `promo-image-wrapper` **do not exist** —
   there is no intermediate container and no image box. `promo-content` is
   renamed **`promo-copy`**: *copy* is what `CONTEXT.md` ("image above the
   copy") and ticket 04 (`--promo-measure`, "max width of the copy") already
   call it, and *content* is badly overloaded in a Plone add-on. A note has been
   appended to ticket 08.
2. **This ticket's own "Settled already" section carried a stale bullet.** It
   said custom properties are declared on the block root. [Ticket
   04](04-decide-the-theme-seam.md) and [ADR
   0002](../../../docs/adr/0002-seam-defaults-live-at-their-point-of-use.md)
   killed that: seam defaults live at their **point of use**,
   `var(--promo-x, <literal>)`, and the sheet declares no `--promo-*` anywhere.
   Genuinely private composition values may still be declared on `.promo`. The
   bullet is corrected in place above.
3. **`promo-cardlink`, one token.** The glossary term is two words, but the flat
   dialect reads `promo-<noun>` and `promo-card-link` invites parsing as
   `promo-card` + `link`, implying a `promo-card` element that does not exist.

### What this hands the downstream tickets

- **08 and 09** are unblocked, and both build against the table above verbatim.
  09's stated test — "the emitted class list equals the React view's" — is now
  a test against a fixed list rather than against whichever ticket landed first.
- **11** gets one selector family per row of the table, all descending from
  `.promo`, and the `.promo-cardlink` wrapper to account for.
- **A flag for 11 and 15, not decided here**: the sheet is `@scope`-wrapped to
  `.aurora-editor`, `.aurora-editor-portal` and `.aurora-blocks-view` — roots
  that exist in Blicca and, per ticket 07's note, nowhere in Aurora proper. The
  anatomy classes are emitted identically in Aurora, but nothing in this bundle
  dresses them there. That is a delivery question about the sheet, not about the
  class names, and it belongs to those tickets.
