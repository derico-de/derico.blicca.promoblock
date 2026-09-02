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
