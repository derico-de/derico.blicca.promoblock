# Build: the derived-key provenance stamp

Type: build
Status: open
Blocked by: 19

## Question

Implement [ADR 0003](../../docs/adr/0003-derived-keys-are-the-servers-and-carry-their-provenance.md),
decided in [ticket 19](19-decide-canvas-image-freshness.md): derived keys are
the server's and carry the reference they were derived from, so the canvas can
tell a fresh key from a stale one without `edit` ever writing to the document.

**No upgrade step.** Nothing here is stored on disk — the derived keys are
stripped on save — and no profile XML, registry record or GenericSetup artifact
changes. Confirmed in ticket 19 against the project rule.

### Server — `image_transform.py`

- Add `image_ref` to `DERIVED_FIELDS`, so it is stripped on load before
  re-deriving and stripped on save with the rest.
- `resolve_image()` stamps `image_ref` with the **normalized** stored reference
  (`stored_image()`'s output) in **every** branch that has one — including the
  two that currently `return {}`: the dangling reference (`brain is None` and no
  url) and referenced content carrying no image at all. A promo with no `image`
  at all stamps nothing.

### Client — `data.ts`

- `imageSrc()` rung 1 becomes conditional: trust `image_url` **only** when
  `text(data.image_ref) === storedImage(data.image)`. A mismatch ignores the
  whole derived set and falls through to the existing rungs 2–4, which is the
  optimistic preview and stays correct for a just-picked picture.
- A **matching** stamp with no `image_url` is a confirmed dead reference:
  `imageSrc()` returns `''`, so `hasImage()` is false and `effectiveAlign()`
  falls to `center` — byte-parity with the server's no-image layout.
- `warnings()` gains the dead-reference row, which is only honest now: without
  provenance the same notice fired on every freshly picked image, which is why
  the current code documents its absence as deliberate. Update that docblock —
  it argues a case that no longer holds.
- Add `image_ref` to the `PromoData` type beside the other derived keys.

### Tests

- `test_image_transform.py`: the stamp is present in all four shapes (resolved
  in-site, external URL, dangling, target with no image), absent when `image` is
  empty, and stripped on save.
- `promo-anatomy.test.tsx` / the parity pair: a matching stamp with no
  `image_url` renders the same anatomy as the server's no-image layout —
  this is the exception the parity claim can now drop.
- `promo-edit.test.tsx`: the replacement case previews the **new** picture; the
  dead-reference case emits the notice; the throwing `onChangeBlock` still does
  not fire, which is the whole point of choosing provenance over a writer.

### Docs

- README: rewrite **both** passages. "A freshly picked picture does not appear
  until the next load" (under the image widget) is no longer true and was always
  misfiled — its cause is the block's own ladder, not the widget's shape. Under
  "Where the two surfaces really differ", the dangling reference drops off the
  list, leaving the title's weight as the only entry.
- The README property/behaviour table gains nothing: `image_ref` is not a seam
  property and not an authored field.

## Answer

<!-- fill in -->
