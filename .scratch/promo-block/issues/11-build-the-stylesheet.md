# Build: one scope-wrapped stylesheet for both surfaces

Type: build
Status: open
Blocked by: 04, 08, 09

## Question

Exactly **one** CSS file serves the editor canvas and the public page, wrapped
by the build (06) as
`@scope (.aurora-editor, .aurora-editor-portal, .aurora-blocks-view) to (.aurora-pattern-island)`.
Anatomy-class parity is what makes that possible.

- **Structure only, cosmetics as properties** (04). The placement switch is
  structure: `left` = row, `right` = row-reverse, `center` = block, image above.
  Padding, colour, border, radius are properties with neutral defaults.
- **Declare properties on the block root**, never on the scope root, which every
  add-on sheet shares. Write rules by **descent** so `.kicker`, `.button` and
  friends inside the block cannot collide with another add-on's.
- **Both surfaces, one file.** Verify the editor canvas and the public page
  actually look the same — this is where anatomy drift between 08 and 09
  surfaces, and it is cheaper to catch here than in review.
- **The transform's behaviour is not optional knowledge**: `@layer` is
  flattened (layers lose to unlayered Barceloneta), `:root`/`html`/`body` are
  rewritten to `:where(:scope)` (a `:root` rule inside `@scope` can never match,
  so tokens would silently vanish), and name-global at-rules are hoisted.
- **Known limit, non-normative**: styles injected from JS bypass the wrap and
  never load on the public page. Don't rely on them.
- Sanity: no `!important`, and nothing outside the block root. The donut limit
  exists to keep embedded Blicca pattern islands out of our reset, not to be
  worked around.

## Answer

<!-- fill in -->

## Obligations from ticket 04 (the theme seam)

[Ticket 04](04-decide-the-theme-seam.md) fixed nineteen `--promo-*` properties
and pushed three duties here:

1. **The defaults live only at their use sites.** Every axis is spelled
   `var(--promo-x, <literal>)`; the sheet declares **no** `--promo-*` property on
   any element (a declaration would shadow the theme's inherited value and break
   the seam). Genuinely private composition values may still be declared on the
   block root, but must not appear in the README table.
2. **A README↔sheet lockstep test.** Assert that every property documented in the
   README appears in the sheet with exactly its documented default, and that the
   sheet declares no `--promo-*`. This is load-bearing: the defaults exist only as
   literals scattered across use sites, and ticket 04's growth policy makes
   **changing a default a breaking change**, so nothing else keeps the published
   table honest.
3. **Verify the defaults on a running site**, which ticket 04 could not do
   because nothing was built. Two surfaces: a Blicca site with **no derico tokens
   loaded** (the bare-host case the literals exist for), and ticket 02's
   vitest/jsdom harness for the Aurora path.

Also write the README property table itself — name, what it paints, default —
plus the two documented interactions: `.block.has--backgroundColor--dark
:where(*) { color: inherit }` is `(0,3,0)` and outranks our `(0,2,0)` inks, so
the promo goes monochrome on the dark slot by design; and the `CanvasText` /
`Canvas` button inverts to light-on-dark there, which is correct but arrives from
the system colours rather than from intent.

The rule behind duties 1 and 2 is
[ADR 0002](../../../docs/adr/0002-seam-defaults-live-at-their-point-of-use.md) — cite it in
the sheet's header comment, so the next reader finds it from the code.

**Note from [ticket 07](07-build-the-two-widgets.md):** this sheet dresses the
**block**, not the sidebar. `promo-block.css` is scope-wrapped to
`.aurora-editor`, `.aurora-editor-portal` and `.aurora-blocks-view` — roots that
exist in Blicca and nowhere in Aurora proper — so it cannot reach the three
promo widgets there. They carry the host's own Tailwind metrics instead; leave
`promo-textarea-widget` / `promo-select-widget` / `promo-link-widget` out of
this file.


## Note from [ticket 08](08-build-editor-half.md) (2026-09-03)

Three constraints the built React half puts on the sheet:

1. **Never select on `[href]`.** No anchor carries one on the editor surface —
   a live `href` on the `.promo-cardlink` wrapper makes the whole block a
   navigation target in the canvas, so the author cannot click to select what
   they are editing. `.promo-cardlink` and `.promo-cta` are the hooks; an
   attribute selector would style the public page and not the canvas.
2. **Two classes exist that do NOT descend from `.promo`**, deliberately:
   `.promo-incomplete` (the skeleton naming the empty slots) and
   `.promo-notice` (one per value the renderers drop). They are the editor's
   own chrome, live **outside** the block root because ticket 17 rule 3 keeps
   that root empty, and are `contentEditable={false}`. The sheet's descent
   habit therefore cannot reach them — they are reachable from the `@scope`
   root instead, as `derico-hero`'s `.derico-hero-incomplete` is. Decide
   whether to dress them at all: unstyled they are plain paragraphs, and in
   Aurora proper nothing dresses them either way (no `.aurora-editor` root),
   which is the residual delivery gap ticket 17 already flagged to this ticket
   and 15.
3. **No `srcset`, no wrapper box around the picture.** The React half emits one
   `<img src>` from ticket 10's `image_url`; `--promo-image-ratio` goes on the
   `<img>` with `object-fit: cover` and `--promo-image-width` is a grid track
   on `.promo`, exactly as ticket 17 specified. There is no `.promo-image`
   inner box to hang either on.

The exact emitted anatomy for 23 states is in `../../../tests/anatomy-cases.json`
— useful as the list of selector families to cover, and as the set of states a
rule must not break.

### Note from [ticket 09](09-build-server-half.md) (2026-09-03)

The server half is built, so both surfaces this sheet dresses now exist.

**The two `<img>` elements do not carry the same attributes.** The server adds
intrinsic `width`/`height` when the image resolved to in-site scales, omits them
for an SVG or an external URL, and the canvas never carries them at all. So size
`.promo-image` from the sheet and do **not** lean on intrinsic attributes for
aspect ratio, or the two surfaces will differ on exactly the images that have
scales. `<picture class="promo-image">` + `<img>` is emitted on both surfaces
whenever there is an image, which is what makes that safe to do in one rule.

This joins ticket 08's standing rule that the sheet must **never select on
`[href]`** — the canvas drops every `href` and keeps every element, tag and
class, so `[href]` is the one selector that can tell the surfaces apart.

