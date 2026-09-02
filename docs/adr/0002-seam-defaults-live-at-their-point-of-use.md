# Seam defaults live at their point of use

The Promo's [[theme seam]] is a list of `--promo-*` custom properties a host
theme sets to make the block its own. The obvious way to give each one a default
is to declare it on the block's root, next to the composition it feeds:

```css
.promo {
  --promo-gap: 2rem;
  --promo-cta-radius: 0.375rem;
  gap: var(--promo-gap);
}
```

That is what `derico-hero` does, it is what this block's map originally
specified, and it does not work. **A custom property declared on an element wins
over an inherited one.** Inheritance is the fallback, not the other way round —
so `.promo { --promo-gap: 2rem }` beats a theme's `:root { --promo-gap: 3rem }`
outright, and not on specificity: the block simply set the value on itself and a
theme's `:root` never reaches it. The theme's only route back is to target
`.promo` directly, which is specificity escalation against a `@scope`-wrapped
sheet — precisely the fight the seam exists to prevent (ADR 0006). A seam whose
defaults are declared is not a seam; it is a set of values with public-looking
names that nobody outside can change.

`derico-hero` is not wrong to do it. Its `--derico-hero-*` values are **private
composition** — the wash, the scrim, the copper — read only by the sheet that
declares them, and never set from outside. Declaring them on the block root is
right there for the same reason it is wrong here: nothing is trying to override
them. The rule inverts the moment a property becomes an interface, and nothing
in the spelling of a property distinguishes the two cases.

Two alternatives were considered. **A second name per axis** —
`.promo { --promo-gap: var(--promo-gap-set, 2rem) }` — restores overridability
but doubles the vocabulary and publishes the uglier half of each pair, so the
documented name and the settable name differ. **A `@layer`** would let an
unlayered theme declaration win, but `scope-wrap.ts` flattens `@layer` out of
the editor bundle, so the two surfaces would disagree.

## Decision

**The block declares no `--promo-*` property anywhere. Every seam default is
written into the `var()` at the point of use: `var(--promo-x, <literal>)`.**

1. **Point of use, every time.** A theme's declaration — on `:root`, on `body`,
   on any ancestor — inherits into the block and is used, because there is
   nothing on the block shadowing it. No specificity escalation, no `!important`,
   no knowledge of our selectors required. Setting the property is the entire
   interface.

2. **Every default is a literal, one level deep.** No `--plone-*`, `--clara-*`
   or `--aurora-*` inside a promo fallback. The `--plone-*` prefix is two
   colliding vocabularies — `plonetheme.barceloneta` publishes 22 properties,
   all chrome, spelling links `--plone-link-color`, while `plonetheme.clara`
   publishes the design system under the same prefix spelling them
   `--plone-color-link` — and native Aurora has neither, where a missing token
   makes the declaration invalid at computed-value time and the property computes
   to `unset`. A theme opts into its own ladder by setting the property; that is
   all `plonetheme.derico`'s token line does, and it is the seam working rather
   than an exception to it.

3. **Publication is what makes a property an API.** A value the block declares
   on itself is private composition and must not appear in the README table.
   A value in the README table must not be declared. The two rules are the same
   rule stated from both ends, and the boundary is the table, not the naming.

4. **A default is a published value.** A theme that sets nothing is relying on
   it, so changing a default is a breaking change — the same weight as removing
   or renaming a property. Adding one is a minor release.

5. **A lockstep test holds the sheet to the table.** Every documented property
   appears in the sheet with exactly its documented default, and the sheet
   declares no `--promo-*`. This is load-bearing rather than tidy: the defaults
   exist only as literals scattered across use sites, so nothing else can catch
   a default that drifted, and nothing else can catch the tidy-up this ADR
   exists to forbid.

## Consequences

- **The sheet looks repetitive, and the repetition is the mechanism.** An axis
  used in three rules carries its literal three times. The instinct to hoist
  those into one declaration block on `.promo` is exactly the change that breaks
  every theme that set the property, and it will look like a cleanup in review.
  The lockstep test fails when someone tries it, but a red test says *what*
  broke; this document says why the obvious tidy-up is wrong.
- **Two blocks in one codebase do the opposite thing.** `derico-hero` declares
  its properties on its root and is correct; the Promo declares none and is
  correct. Without a written reason the pair reads as an inconsistency, and
  someone will resolve it in the wrong direction — the same hazard the map flags
  for the `image` field name.
- **The sheet has no readable inventory of its own defaults.** You cannot open
  `promo.css` and see the palette; you read the README table. That is the cost
  of the mechanism, and it is why the table is a deliverable of the stylesheet
  ticket rather than documentation written afterwards.
- **A theme can set a property it cannot see the effect of.** Properties whose
  default is `none` or `0` — the border, the radii, the padding — paint nothing
  until set, which is intended, but a theme author reading only the rendered
  block cannot discover them. The README table is the sole discovery surface,
  and an undocumented property is not part of the seam.
- **Private composition still needs discipline.** Nothing prevents adding a
  declared `--promo-internal-x` on the block root, and nothing should — but the
  moment someone documents it, it stops working as documented. The lockstep
  test's second assertion (no `--promo-*` declared) is deliberately stricter
  than necessary for this reason: it forbids the shape rather than trusting the
  distinction to be remembered.
- **The rule generalises to the next block add-on.** Any block whose sheet is
  `@scope`-wrapped and which offers a theme seam has this same problem, and the
  ground it must *not* mint a property for — `--aurora-block-bg-*` — is already
  generic across blocks. This ADR is written about the Promo, but a second block
  copying it should copy this too.
