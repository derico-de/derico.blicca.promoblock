# Verify: reference case B — image beside the copy

Type: verify
Status: open
Blocked by: 08, 09, 11, 12

## Question

The second reference case, and the one the map insists on: **`left` placement
with an image**. It shares almost no layout with case A, so a block validated
only against the image-less band would ship a broken row.

- Kicker set, title, description, an image chosen through the host widget,
  `align: left`, then the same again with `align: right`, then `center` **with**
  the image (image above the copy — the value that confuses everyone).
- **Both actions absent, card link set** — this is the only case that exercises
  the whole-promo-clickable path, which case A cannot reach because it has two
  actions.
- Then add one action label and confirm the card link goes inert and the field
  disappears from the sidebar while its value survives.
- **The image widget's real behaviour**, per ticket 01: upload a new image, and
  pick an existing one. Both must land, and both must survive a save/reload
  round trip with scales resolved by ticket 10's transformer.
- Verify a **deleted** target image degrades to the no-image layout rather than
  throwing.
- Real tests, plus one look at it on the sandbox site.

## Answer

<!-- fill in -->


## Notes from [ticket 11](11-build-the-stylesheet.md) (2026-09-03)

The layout this case exercises is verified in Chromium on the running site at
fixed widths, but never with a real image or a real save/reload:

- `left` gives two equal tracks (`434px 434px` from `1fr 1fr` at 900px);
  `right` reverses the template and re-places both children, so
  `--promo-image-width` always names the image's own track.
- **The collapse is a CONTAINER query at 34rem of the block's own inline size**,
  not a viewport query — the canvas column and the published page are different
  widths at the same viewport. Verified stacking at 400px. This is the thing to
  look at in the canvas specifically: it is the case a viewport query would have
  got wrong, and the one this case can prove.
- The `<img>` is sized from the sheet (`width: 100%; height: auto`) and NOT from
  its intrinsic attributes, because the server carries `width`/`height` only
  when scales resolved and the canvas never does (ticket 09). A deleted target
  image is the case where the two surfaces are most likely to diverge visually
  even though the anatomy agrees.
- `--promo-image-ratio` defaults to `auto`, so nothing is cropped until a theme
  asks for it; `object-fit: cover` is inert until then.


## Notes from [ticket 13](13-verify-reference-case-imageless.md) (2026-09-03)

Reference case A did the image-less half; two things it found are yours.

- **The image field renders in the Blicca sidebar with NO LABEL.** Live on
  `@@aurora-edit`, the *Default* fieldset is Kicker, Title, Description and then
  a bare text input: the host's image widget takes the field (ticket 01's whole
  point) and drops the schema's `image: {title: "Image"}` on the way. The
  block's own three widgets label themselves; this one is the host's. Case A
  never notices because it has no picture — case B is where an author meets an
  unlabelled control, so decide there whether the block works around it (a
  `promo_image` wrapper would cost the host's upload) or the sidebar's shape is
  simply reported upstream.
- **The live probe page already exists**: `/Plone/promo-band-probe`, published,
  an Article carrying one full-width promo on the `dark` slot. Adding a second
  block with a picture beside it is cheaper than authoring a page, and it puts
  the two reference cases on one screen.
- **The dark slot flattens every colour on BOTH surfaces**, canvas included —
  the rule names `[data-slate-editor]`. If case B is authored on a tinted slot,
  do not read a flattened colour in the canvas as a canvas bug.
