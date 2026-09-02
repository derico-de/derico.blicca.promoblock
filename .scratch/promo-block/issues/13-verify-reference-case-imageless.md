# Verify: reference case A — the image-less centred band

Type: verify
Status: open
Blocked by: 08, 09, 11, 12

## Question

Reproduce derico.de's closing call to action as a Promo, to exercise the
image-less path end to end: kicker empty, title "Erstgespräch vereinbaren", one
sentence of description, no image, `center` placement, `blockWidth: full`, a
band background, primary action `variant: button`, secondary action
`variant: link` pointing at a **`mailto:`**.

- **It must render on both surfaces** — the canvas and the public page — and
  look the same.
- **The `mailto:` is the point.** This is where `path_of()`'s scheme-stripping
  would bite; ticket 09's screening rule is verified here or it is not verified.
- **The band itself is not migrated.** It stays a chrome pagelet
  (`plonetheme.derico/templates/contact.pt`), deliberately identical on every
  page. This ticket proves the block *could* express it, which is evidence the
  block's shape is right — it is not a plan to replace the band.
- **A reference case is evidence, never specification.** If reproducing it
  exactly would require an option the block does not have, the answer is the
  theme seam or a deliberate new option — not a derico-shaped special case in
  the block.
- Record the result as a real test, not a screenshot in a comment: the house
  rule is real tests over verification scripts.

## Answer

<!-- fill in -->
