# Build: retune the Promo for derico, in tokens only

Type: build
Status: open
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

<!-- fill in -->

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
