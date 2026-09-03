# Build: retune the Promo for derico, in tokens only

Type: build
Status: resolved
Blocked by: 04, 11

## Question

The one change that lands in `plonetheme.derico` — and it must be tokens, not
rules.

- **Point the block's properties at derico's ladder**: `--promo-cta-bg` →
  `var(--derico-copper)`, and whatever else ticket 04's list requires, so the
  Promo wears copper without a single rule being restated. This is exactly how
  the theme already takes over Clara's button
  (`--clara-button-border-color: var(--derico-copper)`).
- **`test_override_minimality.py` must still pass.** The theme is a token layer
  by design and by test; a rule earns its place only when nothing else can reach
  the thing it styles, and a block's scope-wrapped sheet can always reach its
  own insides. If a want cannot be expressed as a token here, that is ticket
  04's list being wrong, not a licence to add a rule.
- **Check the contrast** of the resulting combination the way the theme's own
  notes do — copper's measured ratios are recorded in `derico.css`, and a
  promo on a tinted band is a different ground than the page.
- **Do not** add derico-shaped markup, classes or variants to the block from
  here. The seam is the whole interface.

## Answer

**Six of the nineteen properties, no rule, and the design source settled every
one of them — including three the table above had wrong.** The line landed in
`plonetheme.derico/src/plonetheme/derico/static/derico.css` as a new **§9**,
alongside §8's `--aurora-block-*` values, because it is the same shape: a
second publisher's token contract, filled by the theme.

### What is set

| property | value | the design line that decided it |
|---|---|---|
| `--promo-kicker-size` | `var(--derico-text-label)` | the theme's 15px label floor |
| `--promo-kicker-color` | `var(--derico-copper-text)` | `.kicker { color: var(--copper-text) }` |
| `--promo-title-size` | `var(--clara-text-title)` | `.mega-intro h2`, `.manifesto-item h3`, … |
| `--promo-cta-bg` | `var(--derico-copper)` | `.button { background: var(--copper) }` |
| `--promo-cta-fg` | `var(--derico-on-copper)` | `.button { color: var(--on-copper) }` |
| `--promo-cta-hover-bg` | `var(--derico-copper-hover)` | `.button:hover` |
| `--promo-cta-radius` | `var(--plone-radius-pill)` | `.button { border-radius: var(--radius-pill) }` |

`test_override_minimality.py` still passes, and the whole theme suite is green
(381). No rule was added anywhere and none was needed — the ticket's "a theme
rule would have to escalate specificity" argument turns out to be about
*declarations of the same property*, and the block declares none (ADR 0002), so
plain inheritance from `:root` is the entire mechanism. Verified on the running
site and, separately, **in the canvas**: `derico.css` is loaded on
`@@aurora-edit` too, so the two surfaces get the seam identically.

### Three corrections to the fixed table

1. **`--promo-title-size` is the design's COMPONENT heading step, not its
   section one.** The table said "Clara's ladder via the `--derico-text-*`
   aliases" and [ticket 13](13-verify-reference-case-imageless.md) measured
   `--derico-text-heading` against the contact band. That reproduces the band
   and **breaks the card**: on `/Plone/promo-band-probe`, which carries case A
   and case B on one page, the heading step put a 56px title on a two-column
   promo with an image, three lines deep in half a column. The design source of
   record is unambiguous — `--text-heading` is `.page-hero h1`,
   `.section-heading` and `.contact-band h2`; every *component* heading
   (`.mega-intro h2`, `.manifesto-item h3`, `.talk-list h3`, `.prose h3`) is
   `--text-title`. A promo is a block an author drops on a page, so it is
   dressed as a card. What the declaration buys is the **ramp**: the block's
   1.75rem literal is this step's maximum, so the two agree at 1440px and
   diverge below it (24.6px at 768px). The band scale is not reachable from
   here at all — see "What this ticket could not close".

2. **`--promo-description-size` is NOT set.** The table said
   `--derico-text-lede`. `--text-lede` is the design's *section* lede
   (`.lede`, `.contact-band-lede`); its card copy states no size at all and so
   is body text — which is the block's 1rem default. Setting it would have made
   the description the same size as the kicker.

3. **`--promo-link-color` is NOT set, and `--derico-brand-text` would have been
   a bug.** The property paints two things: the `link` CTA variant *and*
   `.promo-cardlink`, the anchor that **wraps the whole block**, where
   `currentColor` is the load-bearing declaration that stops the UA link colour
   reaching every child. A brand step there tints an entire card-linked promo —
   kicker, title and description — cyan. And it is unnecessary: the design's
   `.quiet-link` is ink, which is what `currentColor` already resolves to
   inside a promo. `contact.css` makes the same choice explicitly for the
   band's own quiet link.

Plus one addition the table lacked: **`--promo-cta-radius`**. The design's
button is `--radius-pill` and the block's literal is `0.375rem`, so an unset
radius left derico's one CTA shape as the only square button on the site. Not a
new property — ticket 04 published the axis; the table simply predates
[ticket 11](11-build-the-stylesheet.md) building it.

### Contrast, measured

Read off the running site through a canvas (real sRGB bytes, not derived from
the OKLCH coordinates), then pinned in `tests/test_promo_seam.py`:

- label on fill **4.60:1**, on the hover fill **5.71:1**;
- the copper fill as a graphical object: **4.60:1** on the page ground,
  **4.30:1** on the `grey` slot, **4.02:1** on `accent`;
- the copper kicker as text: **6.43 / 6.01 / 5.61:1** on those three grounds.

**Ticket 13's dark-slot caveat is real and costs nothing.** Blicca flattens the
button's ink to `--aurora-block-fg-dark` whatever `--promo-cta-fg` is set to —
confirmed live, the canvas and the page alike — but both inks are near-white,
so the measurement lands on the same **4.60:1**. Recorded as its own row rather
than assumed.

**One measurement fails and ships anyway, stated rather than omitted:** the
copper fill is **2.24:1** against the `dark` slot, under the 3:1 a graphical
object wants. It ships because the control is identified by its label (4.60:1
on the fill) rather than by an edge; because the theme's existing tables make
the same call — `--clara-amber` is held to 3:1 against the page and both light
slots and against the dark slot by nothing; and because the only fix in the
seam is `--promo-cta-border`, one global property that would ring every promo
button everywhere to repair one slot.
`test_the_copper_button_does_not_outline_itself_against_the_dark_slot` is
written **inverted**, so if copper lightens or the slot lifts, the omission
stops being a choice and fails.

### The guard the ticket asked review to carry

The ticket said a rule sneaking into this repository "would pass CI; it is
caught at review". It is caught by CI now. `tests/test_promo_seam.py`:

- reads the `--promo-*` names out of the **block's own built stylesheet**, so a
  renamed or dropped property fails here instead of silently painting a
  default (both directions);
- requires every value to be a bare `var(--ladder-step)`, never a literal;
- fails **any** sheet in this package that declares a `--promo-*`, and any
  declaration in `derico.css` outside `:root` — per RULE, not per name, because
  the likely mistake is a *second* declaration of a property §9 already sets
  (`.block.has--block-width--full { --promo-title-size: … }`), which a
  name-set comparison cannot see. That hole was found by mutation-checking, not
  by reading;
- pins the two declined properties with the design line that declined them, so
  the table above cannot be re-applied from memory.

All eight guards mutation-checked with a passing control; the contrast rows
were checked by lightening copper until they fail.

### What this ticket could not close

**The band scale.** Reference case A wants the promo's title at the design's
section-heading step and a card wants the component step, and the seam
publishes **one** title size with no context axis. The theme cannot express
both without a rule keyed on `has--block-width--full`, which this ticket
forbids and `test_override_minimality` rejects. Raised as
[ticket 20](20-decide-promo-title-scale-axis.md) rather than decided here: it
is ticket 04's list growing, which is the block's call and not the theme's.

**A finding beyond this block entirely:** every Aurora block on a published
derico page renders its body copy in Tailwind's `ui-sans-serif` stack, not
Clara's Source Sans 3 — `.aurora-blocks-view` itself computes to it while
`body` computes Source Sans 3. It is the scoped preflight inherited by every
block, it predates the promo, and no `--promo-*` property can reach it. Noted
on the map as out of scope for this effort.

### Assets

`/Plone/promo-band-probe`, on the running site; screenshots under
`.playwright-mcp/`: `promo-16-before.png` (unthemed), `promo-16-after.png` (the
table applied verbatim — the case where the band reads right and the cards
tower), `promo-16-card-line.png` (what shipped) and `promo-16-canvas.png` (the
same values in `@@aurora-edit`).

## The mapping, fixed by ticket 04

[Ticket 04](04-decide-the-theme-seam.md) published the property surface, so this
ticket is now fully determined — tokens only, no rules:

| property | derico token |
|---|---|
| `--promo-cta-bg` | `--derico-copper` |
| `--promo-cta-fg` | `--derico-on-copper` |
| `--promo-cta-hover-bg` | `--derico-copper-hover` |
| `--promo-kicker-color` | `--derico-copper-text` |
| `--promo-link-color` | `--derico-brand-text` |
| `--promo-kicker-size` | `--derico-text-label` |
| `--promo-title-size` | Clara's ladder via the `--derico-text-*` aliases |
| `--promo-description-size` | `--derico-text-lede` |

Set them where they **inherit** into the block — `:root` or the theme's own
scope root — never on `.promo`, and never with a plain rule: the block's sheet is
`@scope`-wrapped and a theme rule would have to escalate specificity to be heard.
Ticket 11's lockstep test does not cover this repository, so a rule that sneaked
in here would pass CI; it is caught at review, which is why "tokens only" is
stated rather than assumed.

Spacing, border, radius and image properties are deliberately left at their
literal defaults unless the reference cases prove otherwise — reach for
`--plone-*` here only, where Clara is guaranteed present.


## Notes from [ticket 11](11-build-the-stylesheet.md) (2026-09-03)

The seam is built and every default is verified on the running site, so this
ticket now has a real target.

- **`--promo-cta-hover-bg`'s default changed.** It is now
  `color-mix(in oklab, var(--promo-cta-bg, CanvasText) 88%, var(--promo-cta-fg, Canvas))`
  — mixed towards the button's own ink, because the published `black` spelling
  computed to the fill exactly on an unthemed host. The mapping above is
  unaffected: this ticket sets `--derico-copper-hover` explicitly and never
  reaches the default. See ticket 04's correction note.
- **There is no `--promo-cta-padding`.** The button's `0.625rem 1.25rem` is a
  literal. If derico's copper button wants different metrics, that is ticket
  04's list growing by one — a minor addition, permitted because the axis
  already exists in the markup — and **not** a rule in the theme. Ticket 11
  flagged it rather than taking it.
- **Contrast has a new baseline to beat.** The unthemed button is `CanvasText`
  on `Canvas`, whose contrast guarantee arrives free. Copper on
  `--derico-on-copper` has to be measured the way `derico.css` measures the
  rest, and a promo on a tinted band is a different ground than the page.
- **Do not set `--promo-*` on `.promo`.** Set them where they inherit in.
  Ticket 11's lockstep test covers the block's own sheet and cannot see this
  repository, so nothing automated catches it here.


## Notes from [ticket 13](13-verify-reference-case-imageless.md) (2026-09-03)

Reference case A was reproduced live and judged against the real pagelet, so the
token line now has measured evidence rather than an intention.

- **Three properties close the whole gap** between an unthemed promo and
  derico's contact band: `--promo-title-size` (28px default against the band's
  much larger heading), `--promo-cta-bg` and `--promo-cta-fg`. Setting them on
  `:root` on the running site turned the promo into a derico band in one pass;
  spacing, radius, measure and flow needed nothing.
- **On the `dark` background slot only the button's FILL is reachable.**
  `--promo-cta-fg` is flattened to the band's foreground by Blicca's
  `.block.has--backgroundColor--dark :where(*) { color: inherit }` whatever this
  ticket sets, so a copper button on a dark band gets the band's light ink and
  not `--derico-on-copper`. Measure the copper against **that** ink, not the one
  you set. On the light and `accent` slots the property works normally.
- **The real band is a LIGHT ground**, so a promo standing in for it wants the
  light or `accent` slot rather than `dark`. Nothing to set — it is the author's
  choice in the sidebar — but it is what the contrast pass should assume.
- The band's ground comes from the theme's own `--aurora-block-bg-dark`
  (`oklch(0.36 0.065 215.55)` live), which derico already sets. That is the
  cross-block vocabulary this ticket must not duplicate as a `--promo-*`.
