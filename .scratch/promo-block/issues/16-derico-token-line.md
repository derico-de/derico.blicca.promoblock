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
