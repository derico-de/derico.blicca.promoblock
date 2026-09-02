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
