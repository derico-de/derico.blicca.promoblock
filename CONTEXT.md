# derico.blicca.promoblock

The Promo block: an authored appeal placed in the flow of a page. A Blicca block
add-on (block add-on contract §3.1) whose editor half is published as the Aurora
npm package `@derico/aurora-promo-block`. Generic by intent — derico.de is its
first consumer, not its subject.

## Language

**Promo block**:
A self-contained, hand-authored appeal placed in the flow of a page — a short
heading, a sentence or two, optionally a picture, optionally one or two
actions. Its subject is **the reader**, not another content item: nothing in it
is derived from a target, every string is typed. Stored `@type: promo`.
_Avoid_: teaser (a teaser stands in for another content item — see
[[teaser-not-promo]]), highlight (already a Plate text mark rendering `<mark>`
in this stack), banner, CTA block.

**Teaser, not promo**:
The distinction that names this block. Aurora's `teaser` dereferences a content
item: pick a target and its title, description and image are pulled from it,
with an overwrite escape hatch. The Promo derives nothing. Both may carry a
link; only the teaser is *about* what it links to. Reference semantics are not
a future feature of this block — if they are wanted, they belong to Aurora's
teaser growing actions and placement, contributed upstream.

**Kicker**:
The short line above the title. Stored as `head_title` — Aurora's teaser and
restapi summaries spell it that way, so a teaser↔promo migration stays a copy —
and labelled "Kicker" in the sidebar, which is what an author calls it. The
same split Volto's teaser makes.
_Avoid_: eyebrow, overline, `headtitle` (Volto's highlight spelling), subtitle.

**Card link**:
The Promo's own target, distinct from its [[call-to-action]]s: when it is set
and neither action carries a label, the whole promo is clickable. When any
action has a label, the actions take the clicks and the card link is ignored —
never both, so no interactive element is ever nested inside another. Offered to
the author only while both action labels are empty; a value set earlier
survives, hidden, and returns when the labels clear.
_Avoid_: href (that is the teaser's target field and carries reference
semantics), target, url.

**Call to action**:
One of the Promo's two action slots, primary and secondary — a fixed pair, not
a list. Each is a label, a link and a [[variant]]. Either may be used without
the other; "primary" and "secondary" name appearance, not order.
_Avoid_: button (that is one [[variant]] of a call to action, not the thing
itself), CTA button, link list.

**Variant**:
How one [[call-to-action]] looks: `button` or `link` — a filled, self-contained
control versus an inline textual link. The distinction is near-universal in web
design and is the block's only *structural* style axis, which is why it is a
stored value rather than a [[theme seam]]. Colour is **not** part of it: a
palette is offered only where the host site registers one, and most sites
register none.
_Avoid_: style, theme, button style (it names the whole axis after one of its
two values).

**Image placement**:
Where the picture sits relative to the copy: `left`, `right` or `center`.
`center` means **image above the copy**, the block stacking rather than sitting
in a row — Volto's teaser spelling, and the only three values Aurora's align
widget has icons for. Meaningless without an image, and not offered then.
_Avoid_: top (no such value exists in Volto core or Aurora; it was a VLT-era
spelling), alignment (that reads as text alignment), float.

**Theme seam**:
The custom properties a host theme sets to make the Promo its own — a fixed,
documented list, whose defaults live at their **point of use** and are declared
nowhere. It is the block's *only* reliable restyling surface, and that is a
mechanism fact rather than a convention: the block's stylesheet is
`@scope`-wrapped, themes ship unlayered CSS, and at equal specificity a scoped
declaration wins (ADR 0006). A theme using plain selectors must escalate
specificity to be heard. The block therefore ships **structure** — the placement
switch, the rhythm, the image box — and expresses every cosmetic as a property
with a neutral default, including axes whose default is `none`. Publication is
what makes a property part of the seam: a value the block declares on itself is
*private composition*, not a seam, because a declared property shadows the
theme's inherited one and cannot be set from outside.
_Avoid_: overrides, skinning, theme CSS (that is the thing the seam exists to
avoid needing); default declaration (the seam has defaults but declares none).

**Reference case**:
A worked instance used to check the block against a real design rather than
against itself. The first is derico.de's closing call to action —
"Erstgespräch vereinbaren", one sentence, a button and a mail link, centred on
a tinted band — which is a Promo with no image, `center` placement, full width
and both actions set. It exercises the image-less path; a second reference case
must exercise `left` placement with an image, because the two share almost no
layout. A reference case is evidence, never the specification.
_Avoid_: acceptance test (it is one case among several), the derico case.
