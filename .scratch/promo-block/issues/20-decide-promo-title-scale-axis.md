# Decide: does the seam grow a context axis for the title scale?

Type: grilling
Status: open
Blocked by: —

## Question

[Ticket 16](16-derico-token-line.md) found the one want a theme cannot express
through the seam, and it is not a missing property — it is a missing **axis**.

`--promo-title-size` is a single value inherited from `:root`, and derico wants
two:

- a promo standing in for a **section band** (reference case A, `blockWidth:
  full`, on a background slot) wants the design's `--text-heading` step —
  measured at 56px against the real contact band, which is what
  [ticket 13](13-verify-reference-case-imageless.md) set;
- a promo used as a **card** (reference case B, default width, image beside the
  copy) wants the component step, `--text-title` — because the heading step put
  a 56px title on half a column, three lines deep, on
  `/Plone/promo-band-probe`.

Ticket 16 shipped the card step, on the design source's own vocabulary
(`--text-heading` is `.page-hero h1` / `.section-heading` / `.contact-band h2`;
every component heading is `--text-title`) and because a promo is a block an
author drops on a page. So the band case is currently **not reachable** from a
theme at all.

The decision:

1. **Leave it.** A promo is a card; a band-scale headline is what a page's own
   `h1` is for, and the contact band stays the chrome pagelet the map already
   rules out of scope as content. The cost is that reference case A, at
   derico's tokens, wears a card title — it is *expressible* (ticket 13 proved
   the anatomy) but not at the design's band scale.
2. **Grow ticket 04's list with a context-aware size.** The markup axis already
   exists — the wrapper stamps `has--block-width--full` — so this is a minor
   addition under the block's growth policy rather than new anatomy. Shape to
   settle: a second property (`--promo-title-size-full`?) that only the block's
   own sheet reads under the right selector, versus the block simply scaling
   the title with a container query and publishing the ramp's ends. The first
   keeps the theme in charge of both values; the second decides the *policy* in
   the block and leaves the theme one property, which is what every other row
   of the table does.
3. **Let the theme keep a token rule.** `.block.has--block-width--full {
   --promo-title-size: … }` in `derico.css` works — a custom property on an
   ancestor inherits in and competes with nothing, so the specificity argument
   the seam rests on does not apply. Rejected in ticket 16 on the theme's own
   doctrine (`test_override_minimality` admits one non-token rule and this is
   not it), but it is the option that needs no upstream change, and
   `test_promo_seam.py` currently fails it by design — so choosing it means
   deliberately relaxing that guard.

Whichever wins, the block's README growth policy and its property table are
part of the deliverable: adding a property is minor, and **changing a default
is breaking**, so option 2 must not move `1.75rem`.
