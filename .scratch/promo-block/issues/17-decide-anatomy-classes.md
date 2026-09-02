# Decide: the anatomy class list both renderers emit

Type: grilling
Status: open
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
- **Rules are written by descent, and custom properties are declared on the
  block root**, not the shared scope root — both habits from `derico-hero`, and
  both are what stop generic inner names colliding with another add-on's.
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

<!-- fill in -->
