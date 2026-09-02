# Decide: the theme seam — which custom properties, and their defaults

Type: grilling
Status: resolved
Blocked by: —

## Question

The property list **is** the theming contract: the block's sheet is
`@scope`-wrapped and beats an unlayered theme rule at equal specificity
(ADR 0006), so an axis we fail to expose is one a theme can reach only by
escalating specificity against us. Fix the list and its defaults.

Agreed shape: structural + cosmetic hooks, roughly a dozen, including axes whose
default is `none`. The test per declaration is *"would a different theme
plausibly want this different?"* — a border yes, the placement switch's flex
direction no, because changing that means you wanted a different block.

- **Enumerate the list.** Starting set to argue with: `--promo-gap`,
  `--promo-padding`, `--promo-border`, `--promo-radius`, `--promo-bg`,
  `--promo-fg`, `--promo-kicker-color`, `--promo-image-width`,
  `--promo-image-ratio`, `--promo-cta-bg`, `--promo-cta-fg`,
  `--promo-cta-radius`, `--promo-link-color`. Add, drop, justify each.
- **Every default must be neutral**, and the block must look deliberate on a
  bare Aurora site with no theme at all. Decide the fallback chain — whether to
  reach through to Plone's semantic tokens (`--plone-color-primary`) before a
  hardcoded value, and verify that chain on the running site rather than on
  paper.
- **Where are they declared?** On the **block root**, not the shared scope root
  (`derico-hero`: "promote to `derico.css` only when a second brand block
  actually wants the wash"). Rules are written by descent so `.kicker` and
  `.button` inside the block cannot collide with another add-on's.
- **Document it as a README table** — name, what it paints, default. An
  undocumented property is not a seam.
- **Decide the growth policy** and state it: adding a property is a minor
  release; removing or renaming one is a breaking change for every theme that
  set it.

## Answer

Settled in the grilling session of 2026-09-02 with md@derico.de. Eight questions
over two rounds. The property table below is the contract tickets 11 and 16
build against, and it is the block's **published API** — see the growth policy.

### Three facts read off the host code, which corrected this ticket's premises

1. **`--plone-*` is not one vocabulary, it is two that collide.** The ticket asks
   whether to reach through to "Plone's semantic tokens" before a literal. There
   are no such tokens to reach. `plonetheme.barceloneta` defines **22**
   `--plone-*` properties and all of them are chrome — `--plone-toolbar-*`,
   `--plone-portlet-*`, `--plone-state-*`, plus `--plone-link-color` /
   `--plone-link-hover-color`. No `--plone-space-*`, no `--plone-radius-*`, no
   `--plone-font-body`, no `--plone-color-primary`. Those are
   `plonetheme.clara`'s, published under the same prefix as its own token
   contract — and where the two overlap the spelling is **reversed**:
   barceloneta's `--plone-link-color` against Clara's `--plone-color-link`,
   neither aliasing the other. A fallback chain through `--plone-*` therefore has
   to pick a side and be wrong on the other host, and on native Aurora — no
   Plone CSS at all — it is wrong on both: `var(--plone-space-m)` is
   invalid-at-computed-value-time, `padding` computes to `unset`, and the block
   collapses instead of looking neutral. `derico-hero` reads these tokens bare
   only because it ships inside the theme that depends on Clara.

2. **Declaring a default on the block root shadows the theme.** The ticket's
   stated answer — "on the block root, not the shared scope root", carried over
   from `derico-hero` — breaks the seam it is describing. A custom property
   declared *on an element* wins over an inherited one, so
   `.promo { --promo-gap: 1.5rem }` beats a theme's `:root { --promo-gap: 3rem }`
   outright: not on specificity, but because we set it on ourselves. The theme's
   only route back is to target `.promo`, which is exactly the specificity
   escalation the seam exists to prevent. Hero's rule is right for hero because
   `--derico-hero-*` are **private composition variables** that nothing outside
   ever sets; it is wrong the moment a property becomes a seam.

3. **The ground is already the host's, and the `dark` slot outranks us.**
   `backgroundColor` (kept by ticket 03) makes the *wrapper* paint a full-bleed
   band from `--block-background` and sets `color: var(--block-foreground,
   inherit)` on the block. Reference case A's tinted band is that mechanism, not
   ours. Further, `blocks_view.css:488` ships
   `.block.has--backgroundColor--dark :where(*) { color: inherit }` at
   **(0,3,0)**, while our scoped `.promo .kicker { … }` is **(0,2,0)** — and
   `@scope` proximity only breaks ties *after* specificity, so on the dark slot
   Blicca flattens every ink we set. That is deliberate upstream ("the one that
   fights the theme"), and we defer to it rather than escalate.

### The mechanism

- **Defaults live at the point of use, never as a declaration.** Every axis is
  spelled `var(--promo-x, <literal>)` in the rule that consumes it. The block
  declares **no** `--promo-*` property anywhere, so a theme's `:root` (or any
  ancestor) inherits in and wins with no specificity escalation. Cost accepted:
  a literal repeats wherever an axis is used more than once, and the sheet has
  no single "here are the defaults" block — the README table is that record,
  which is why the lockstep test below exists.
- **Private composition values keep hero's rule.** Anything that is genuinely
  internal and not a seam axis is still declared on the block root, under a name
  the README does **not** publish. Publication is what makes a property an API.
- **Literals only — one level deep.** No `--plone-*`, no `--clara-*`, no
  `--aurora-*` in a promo default (fact 1). A theme opts into its own ladder by
  setting the property: `--promo-title-size: var(--plone-text-2xl)` is ticket
  16's whole job, and it is the seam working as designed rather than a special
  case.
- **The ground is generic and is not ours.** The block declares no background or
  foreground property. Backgrounds are `backgroundColor`'s `--aurora-block-bg-*`
  slots — a **cross-block** vocabulary, and the README says so as a rule, not
  merely by omitting it: a block needing a ground uses the generic name, and
  minting a per-block spelling (`--promo-bg`) is the mistake to avoid. Two
  grounds for one block is the defect; a promo on a band gets the band from the
  wrapper, full-bleed, correctly.

### The property surface

Nineteen properties. Every default is a literal, and **every default is part of
the published contract** (growth policy below).

| property | default | what it paints |
|---|---|---|
| `--promo-gap` | `2rem` | image column ↔ copy column |
| `--promo-flow` | `0.75rem` | rhythm *within* the copy stack |
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
| `--promo-cta-hover-bg` | `color-mix(in oklab, var(--promo-cta-bg, CanvasText) 88%, black)` | button fill on hover |
| `--promo-cta-radius` | `0.375rem` | button corner radius |
| `--promo-cta-border` | `none` | button border |

Notes on the ones that were argued:

- **`gap` is two axes, not one.** A single property means a theme cannot tighten
  the copy stack without also narrowing the columns. `--promo-flow` is the
  cheapest of the additions to sacrifice if the list is ever cut.
- **`--promo-measure` is forced, not optional.** Reference case A is `center`
  placement at `blockWidth: full`; without a measure the copy runs the full
  bleed and is unreadable. We must state one, so it must be a property.
- **`--promo-padding` defaults to `0` on purpose.** The host's background slot
  already pads the band with `--aurora-space-block`; a non-zero default
  double-pads every banded promo. Documented as "turn this on together with a
  border or a ground".
- **`--promo-image-ratio` defaults to `auto`, never a ratio.** Forcing one crops
  the author's image by default.
- **`--promo-image-width` is a grid track**, so `1fr`, `22rem` and `40%` all
  work; `1fr` gives equal columns.
- **`--promo-cta-hover-bg` derives from whatever the theme set.** A theme that
  sets only the fill otherwise gets a dead button; the `color-mix` default keeps
  the hover step correct without the theme naming it.
- **`--promo-cta-border` exists because fill + ink cannot express a ghost
  button.** This is the ticket's own "a border yes" test applied to the CTA.
- **The CTA defaults are CSS system colours.** `CanvasText` on `Canvas` is a
  guaranteed-contrast pair on any ground, adapts to the user's light/dark
  preference, and reads as *not yet branded* rather than as a colour we chose.
  The contrast guarantee comes free instead of being asserted, which matters
  because this block has no measured contrast suite like `derico-hero`'s. One
  oddity to document: on the `dark` background slot this yields a light button
  on a dark band — the correct inversion, but arrived at by accident of
  `Canvas`, so the README says so rather than letting a reader infer design
  intent.
- **The kicker's distinction is size and colour only.** No `font-weight`, no
  `text-transform` — both would be scope-locked and each would need a twentieth
  and twenty-first property to recover. On a bare site the kicker is simply
  smaller text; a theme adds the accent through `--promo-kicker-color`.

**Type is stated rather than inherited** (`--promo-*-size`), and this is the one
place the block deliberately locks the theme out and hands back a key. Leaning on
semantic elements alone was the tempting answer and fails where the destination
says it must not: native Aurora runs Tailwind preflight, which resets headings to
`inherit`, so a title with no stated size renders as one of three identical grey
lines — with no property to recover it, and the theme's only route back the
specificity escalation the seam forbids. Three properties buy a block that is
deliberate in both hosts and fully recoverable in both.

### Deliberate non-properties

- **The placement switch's flex/grid direction.** Changing it means you wanted a
  different block.
- **The focus ring.** The block sets no `outline` at all, so the host's
  `:focus-visible` reaches the button unopposed. A property here would be a seam
  over something that was never blocked.
- **Background and foreground.** Fact 3 — the host's, and generically named.

### Growth policy

- Adding a property is a **minor** release.
- Removing or renaming one is **breaking**.
- **Changing a default is also breaking.** A theme that set nothing is relying on
  the default, so a default is a published value and not an implementation
  detail. This is the clause most likely to be forgotten, hence the lockstep test
  below.
- A property may only be added for an axis that **already exists in the markup**.
  A new axis needing new anatomy is ticket 17's business first.

### Obligations pushed to other tickets

- **Ticket 11 (the stylesheet)** — three, all recorded on that ticket:
  1. Assert the seam mechanically: **every property documented in the README
     appears in the sheet with exactly its documented default**, and the sheet
     declares no `--promo-*` property on any element. This is what keeps the
     README honest, given the defaults live only at their use sites and a
     changed default is a breaking change.
  2. Verify the defaults **on a running site**, as this ticket asked and could
     not do — nothing is built yet. Two surfaces: a Blicca site with no derico
     tokens loaded, and the vitest/jsdom harness ticket 02 established.
  3. Write the README property table itself — name, what it paints, default —
     plus the two documented interactions (the `dark` slot flattening our inks,
     and the system-colour button inverting on it).
- **Ticket 16 (the derico token line)** — the mapping is now fully determined:
  `--promo-cta-bg` → `--derico-copper`, `--promo-cta-fg` → `--derico-on-copper`,
  `--promo-cta-hover-bg` → `--derico-copper-hover`, `--promo-kicker-color` →
  `--derico-copper-text`, `--promo-link-color` → `--derico-brand-text`, and the
  three type sizes onto Clara's ladder via the `--derico-text-*` aliases. Tokens
  only, no rules — which is now provable, because a rule would have to escalate
  specificity against the scope and the lockstep test would not catch it but the
  review would.

### Recorded as an ADR

Mechanism 2 — the block declares no `--promo-*` property, every default lives at
its point of use — is written up as
[ADR 0002](../../../docs/adr/0002-seam-defaults-live-at-their-point-of-use.md). It travels
with the package rather than with this map, because the reader who needs it is
someone editing `promo.css` and about to hoist nineteen scattered literals into
one tidy declaration block on `.promo`. The lockstep test catches that change;
the ADR explains why the obvious cleanup is wrong, and why `derico-hero` doing
the opposite in the same codebase is not an inconsistency to resolve.
