# Build: one scope-wrapped stylesheet for both surfaces

Type: build
Status: resolved
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

Built. **One sheet, 345 source lines, twelve selector families, and one
published default corrected because the running site proved it dead.**
`bundle-src/src/styles.css` → `static/promo-block.css` (16.2 kB), 170 vitest
tests and the 200 Python tests still green.

### What was built

`.promo` is **one grid for all three placements**, so `--promo-gap` is the same
axis in both readings — image against copy. `center` is a single column,
`left`/`right` are two, and `right` REVERSES THE TEMPLATE rather than the
values, so `--promo-image-width` always names the image's own track whichever
side it is on. Ticket 17 rule 1 pays for itself here: because
`has--align--<value>` carries the *effective* placement, `left`/`right` may
assume two children (an image-less promo always resolves to `center`), and
there is exactly one selector family instead of two plus an image-presence
class.

**The collapse is a container query, and it had to be expressed on the
children.** `left`/`right` fall back to the stacked layout below 34rem of the
block's OWN inline size, not the viewport's: the canvas column and the
published page are different widths at the same viewport, so a media query
would get the canvas wrong — `derico-hero`'s ticket-07 finding, and it holds
here for a different reason. The cost is structural and worth writing down: a
container CANNOT QUERY ITSELF, so no rule can reach into `@container` and
change `.promo`'s own `grid-template-columns`. The collapse therefore makes both
children span `1 / -1` and auto-place into their own rows, which stacks them
image-above-copy exactly as `center` does. **Specificity is load-bearing in that
block**: the wide `right` rules are (0,3,0), so the collapse is spelled at
(0,3,0) too — the obvious `.promo > *` spelling is (0,2,0) and would silently
lose, collapsing `left` and leaving `right` in two columns. Verified in
Chromium: `@container` nested inside the `@scope` wrap parses and fires.

**Three declarations are parity statements rather than look choices**, and each
would otherwise make the two hosts — or the two surfaces — disagree:

- `margin: 0` on kicker/title/description. Barceloneta gives `h2` and `p` their
  own margins and Aurora's preflight zeroes them; left alone the same promo is
  spaced differently per host, and `--promo-flow` is the handle that gives the
  rhythm back. Measured on the site: both margins compute to `0px` with
  Barceloneta loaded, so the flow gap is the only rhythm.
- `white-space: normal` on the root — the Plate editable computes `pre-wrap`
  and it inherits in, breaking the title mid-token where the public page keeps
  it whole. Parity comes from STATING the value, not from which value
  (`derico-hero`'s rule, and this block is safe to normalise for the same
  reason: nothing inside is contenteditable).
- `width: 100% / height: auto` on the `<img>`. Ticket 09's note is why: the
  server's `<img>` carries intrinsic `width`/`height` when scales resolved and
  the canvas's never does, so leaning on the attributes would make the two
  surfaces differ on exactly the images that have scales.

### The one decision the ticket left open: dress the editor's chrome — yes

`.promo-incomplete` and `.promo-notice` are dressed, **with literals only and
never a `--promo-*`**. They are the editor telling the author what it dropped,
not part of the block's published surface, and a theme should not be able to
restyle a nag into invisibility. Unstyled they are plain paragraphs sitting
directly under the preview, which an author reads as block content — the failure
mode is silent and it is the author who pays. They stay undressed in Aurora
proper, where none of the three scope roots exists; that is the residual
delivery gap ticket 17 flagged, and it is survivable precisely because they are
prose rather than icons. `GrayText` and a 2px inline-start rule, both system
colours or plain literals, so they are quiet on any ground in either colour
scheme.

They are the **second** deliberate exception to descent, after
`.promo-cardlink`, which cannot descend from `.promo` because it WRAPS it. Both
are marked as exceptions in the sheet.

The card link carries one declaration that is genuinely load-bearing rather than
cosmetic: **neutralising the UA link colour**. Without it the wrapper anchor
tints the ENTIRE promo blue — title, kicker, description. With
`--promo-link-color`'s `currentColor` default it simply inherits the surrounding
ink. Its hover affordance is `text-decoration: underline` on the title, spelled
without an attribute selector so it behaves identically on both surfaces
(ticket 08's standing rule), and `:hover` matching an `href`-less anchor is what
shows the author in the canvas that the whole card is a link.

### THE CORRECTION: ticket 04's `--promo-cta-hover-bg` default was dead on arrival

Measured on the running site, and it is the finding this ticket exists to
surface:

```
color-mix(in oklab, CanvasText 88%, black)  ->  oklab(0 0 0)
CanvasText                                  ->  rgb(0, 0, 0)
```

`CanvasText` already IS black in a light colour scheme, so the published default
mixes black with black. **The unthemed button had no hover feedback at all** —
precisely the dead button the property was invented to prevent, arrived at from
the other end. Ticket 04 reasoned the default from the *themed* case ("a theme
that sets only the fill otherwise gets a dead button") and never evaluated it
against its own fallback, which nothing could have caught before something was
built.

Corrected to mix towards **the button's own ink**:

| | fill | hover | step |
|---|---|---|---|
| default, published spelling | `oklab(0)` | `oklab(0)` | **none** |
| default, corrected | `oklab(0)` | `oklab(0.12)` | visible |
| copper, published spelling | `oklch(0.72 …)` | `oklab(0.6336 …)` | darker |
| copper, corrected | `oklch(0.72 …)` | `oklab(0.6552 …)` | darker |

`var(--promo-cta-fg, Canvas)` cannot degenerate, because the ink contrasts with
the fill **by construction** — that is what makes it the ink. The direction
ticket 04 wanted survives for a themed fill (copper still darkens), and a dark
fill with light ink now brightens on hover, which is the conventional move for
that case rather than a second dead button. **This changes a published default,
which the growth policy calls breaking**; it is taken now because nothing has
been released (`1.0.0-alpha.1`, no remote, ticket 18 open) and because it
repairs the default to meet its own stated intent rather than changing that
intent. Recorded on [ticket 04](04-decide-the-theme-seam.md) as well, so the
published table and the decision that produced it do not disagree.

### The three obligations from ticket 04

**1. Defaults at their point of use, nothing declared.** Done, nineteen
properties, and the sheet declares no `--promo-*` anywhere. No private
composition value was needed either: the one value that wanted to be a variable
— the 34rem collapse — CANNOT be one, because a container query's condition does
not accept `var()`. It is a commented literal.

**2. The README↔sheet lockstep test.** `bundle-src/test/seam-lockstep.test.ts`,
and it fails in **five directions**, not one: a documented property no rule
consumes; a use whose fallback differs from the table; a use with **no**
fallback (the axis stops working on a bare host); a `--promo-*` consumed but not
published; and a `--promo-*` DECLARED, which is the ADR 0002 tidy-up. Plus the
three sanity rules as assertions — no `!important`, no `[href]`, no `outline`.

The value parser is hand-written and **recursive**, because the fallback is
paren-balanced: `--promo-cta-hover-bg`'s default *contains*
`var(--promo-cta-bg, …)`, and that nested use is held to the table too — a regex
cannot see it. Comments are stripped before anything is scanned, because the
sheet's own header explains the mechanism using a literal
`var(--promo-x, <literal>)`. Whitespace equivalence is exactly two rules
(collapse runs, and strip the padding just inside parens) so the README can
state a default on one row while the sheet wraps it readably; **nothing else
about a value is relaxed**, proved by mutating `88%` → `80%` and the nested
`Canvas` → `white`, both of which fail.

**Proved by mutation, with a passing control**, ten in all: a changed default;
a stripped fallback; a `--promo-gap` declaration hoisted onto `.promo`; an
undocumented property; an extra README row; `!important`; `[href]`; `outline`;
and the two value-drifts above. Every one fires on exactly the assertion it
should. The test carries two explicit **controls** — that the table parsed to 19
rows and that the sheet parsed to more uses than rows — because every assertion
in it is vacuously true against an empty parse and both parsers are
hand-written.

**3. Verify the defaults on a running site.** Done, on `/Plone` — a real Blicca
public page, anonymous, with `blocks_view.css` and Barceloneta loaded and
**every `--promo-*` unset** (asserted first: ticket 16 is open, so this genuinely
is the bare-host case the literals exist for). Confirmed live: the block CSS is
**delivered publicly** (`++webresource++…/++plone++derico.blicca.promoblock/promo-block.css`,
served from the fresh build); `gap` 32px, `padding` 0, border 0, radius 0,
`container-name: promo`; `left` gives `434px 434px` from `1fr 1fr` at 900px;
`right` puts the image in column 2 and the copy in column 1; at 400px both span
`1 / -1` and the copy's top clears the image's bottom, i.e. it really stacks;
copy `row-gap` 12px and `max-width` 610.78px = 60ch; kicker 14px, title 28px,
description 16px, all margins 0; button `rgb(0,0,0)` on `rgb(255,255,255)` with
6px radius, no border, no outline; kicker, link variant and card link all
resolve to the body ink via `currentColor`; the card link carries no underline;
`.promo-incomplete` is 13px `rgb(128,128,128)` with its 2px rule.

Two live readings needed a second look rather than being taken at face value:

- **`margin-left` reported `0px` on the centred copy.** Not a failure — Chrome
  reports `0px` for an auto margin on a grid item. Measured geometrically
  instead: left inset 351px, right inset 351px. It is centred.
- **The centred copy box is `fit-content`, not the full measure.** Auto margins
  absorb all free space, so the box shrinks to its content and `--promo-measure`
  acts as a **cap**. That is exactly what the README says it is ("max width of
  the copy"), and it is better typography than a 60ch box holding three short
  lines — but it is worth knowing before reference case A is judged.

The Aurora half of duty 3 is `bundle-src/test/sheet-selectors.test.tsx`. jsdom
does no layout and does not resolve custom properties, so it asserts
**reachability** rather than values: every selector in the sheet matches
something one of the two renderers actually emits, across all 23 fixture cases
rendered through BOTH `view` and `edit`, plus two synthetic states the
cross-renderer fixture has no reason to carry (`right`, and a card link with a
title). This catches the failure this ticket is most exposed to and that nothing
else covers — the sheet and the renderers agree by NAME ONLY, there is no
compiler between `promo-copy` in `PromoView.tsx` and `.promo-copy` here, and
ticket 17 renamed `promo-content` late. A stale selector fails *silently*: the
block renders, the rule never applies, nothing goes red. Mutation-checked by
reinstating that very rename (4 selectors die) and by sneaking in a
`:focus-within`, which the allowlisted-pseudo assertion catches so no untested
pseudo can pass.

### Three observations handed on, not fixed here

1. **There is no `--promo-cta-padding`.** The button's `0.625rem 1.25rem` is a
   literal, because ticket 04's list is closed and adding a twentieth property
   is not this ticket's call. The axis exists in the markup, so the growth
   policy permits it as a minor addition **if** ticket 16 or a reference case
   proves the want. Flagged, not taken.
2. **The title is `font-weight: 600` here and body weight in Aurora.** Only the
   three `--promo-*-size` properties are stated, per ticket 04, so weight and
   leading come from the host: measured 600/31.36px under Barceloneta, and
   Aurora's preflight flattens headings to `inherit`. The two SURFACES agree
   within each host, which is what parity claims; the two HOSTS differ. If that
   reads as broken in ticket 15, the answer is a property, not a rule.
3. **The `dark` slot flattening was not exercised live** — it needs a real block
   carrying `has--backgroundColor--dark`, which is ticket 13's band. The
   arithmetic is confirmed from the source: `blocks_view.css:488` is
   `:is(.aurora-blocks-view, [data-slate-editor]) .block.has--backgroundColor--dark
   :where(*)`, which is (0,3,0) against our (0,2,0). Both interactions are
   written into the README as documented behaviour.

### Also delivered

The package **README** is now the block's published contract rather than the
plonecli boilerplate: the anatomy, the seam and its nineteen rows, the growth
policy, the two documented interactions, the deliberate non-properties, where
the placements collapse, and the real build/test commands (`pnpm` for the JS
half, `uv run --no-sync pytest` from the assembly root for the Python half).

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

