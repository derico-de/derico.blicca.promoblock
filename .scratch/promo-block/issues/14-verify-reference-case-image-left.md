# Verify: reference case B — image beside the copy

Type: verify
Status: resolved
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

**Reproduced on both surfaces at all three placements, and it needed nothing the
block does not have — but the image field turned out to be two findings, and
both belong to the host's widget rather than to the promo.** The picture path is
whole: a picked reference and an uploaded file both land, both survive save and
reload with scales resolved by ticket 10's transformer, a deleted target
degrades the layout instead of throwing, and the card link takes the whole card
while the actions are empty. What the case exposed that ticket 13 could not is
that the *canvas* and the *page* disagree about a picture in two states, which
is now documented and, for the part that is a decision, ticketed as
[Decide: what the canvas shows when `image` and `image_url` disagree](19-decide-canvas-image-freshness.md).

### What holds it, as tests

- **The case is the fixture's 25th**, `reference-case-image-beside-the-copy` —
  the combination no other case reached: a picture, a placement, and both action
  labels empty with a card link set, so the whole card takes the click *around*
  an image. (`card-link` has no picture, `image-left` has an action, case A can
  reach neither.) Both renderers are held to it exactly and as a skeleton, and
  it passed on the first run against each — hand-authored from ticket 17's
  table, not transcribed from either renderer.
- **`tests/test_reference_case_image.py`** (23 tests) is the only place the
  transformer and a renderer run in **one** call. Everywhere else the two halves
  are apart: `test_image_transform` resolves a real Image and stops at
  `image_source()`, `test_view_promo_block_view` renders every anatomy case but
  hand-stamps `image_url`. So "an author picks a picture and the page shows it"
  was asserted nowhere. Here a real `Image` is created, referenced as ticket 07
  stores a picked value, and rendered through `render_blocks` — with the derived
  keys **stripped from the stored node first**, because a node carrying
  `image_url` is one no save ever produced.
- What only that range reaches: a stored reference becoming a real `src` with
  the intrinsic `width`/`height` that appear only when scales resolved; the
  three placements surviving **as authored** (case A is `center` whatever was
  stored, so only a case with a picture can show this); the card link resolving
  a picked target in the same pass that resolved the image, with the promo still
  exactly one interactive element; and the deleted picture moving ticket 10's
  rule and ticket 17's rule 1 **together** — the `<picture>` goes and the
  placement falls back to `center` in the same render, which is the layout
  change ticket 11 flagged. Plus one consequence stated as a test rather than a
  comment: replacing the image's data changes the page **without a save**,
  because the `src` is derived at render time.
- **`promo-schema.test.ts` gained a reference-case-B block** (5 tests), the
  mirror of case A's: A is the promo with both conditionals **closed**, B the
  promo with both **open**, so between them the sidebar's whole conditional
  surface is exercised against nodes someone actually authored rather than
  against synthetic states. It also asserts no derived key is ever offered as a
  field, and that — unlike case A, which cannot get its dark ground in Aurora
  proper — case B carries no host-only field at all, so it is offered whole
  against the upstream registry.
- Mutation-checked, three ways: making `effective_align` ignore the picture, or
  `card_link` ignore the labels, each fails exactly the test that names the
  rule; **unregistering the image serializer fails 12 of the 23**, which is the
  composition claim proving itself. **235 Python tests, 183 vitest**, typecheck
  green.

### Verified live on `localhost:8081`

Three promos added beside the band on `/Plone/promo-band-probe` (`left`,
`right`, `center`, one picture, card link to `/Plone/contact`), left in place
for ticket 16.

- **Public page, 1440px**: `left` and `right` are two equal 454px tracks — the
  `right` rules reverse the template and re-place both children, so
  `--promo-image-width` names the image's own track either way. `center` **with**
  a picture is one 940px track with the image above the copy at 940x529 and the
  copy back at its 60ch cap: the value that confuses everyone, rendering as
  designed. `object-fit: cover` is inert while `--promo-image-ratio` is `auto`,
  as ticket 11 said.
- **The collapse is a container query, and it was the right call.** At a 620px
  viewport the block is 538.5px inline — under 34rem — and **all three**
  placements stack, image first, image full width; at 640px (558.5px inline)
  none do. Written on the children at (0,3,0), so `right` collapses too; the
  obvious `.promo > *` spelling would have collapsed only one placement.
- **Canvas**: same anatomy, same metrics (940px block, 454px tracks, image
  454x255 and 940x529 — identical to the page). The `<img>` carries **no**
  `width`/`height` there and is sized by the sheet alone, which is exactly what
  ticket 11 predicted and what makes the two heights match. No anchor carries an
  `href`; `.promo-incomplete` names the empty slots.
- **The click rule, driven through the sidebar**: typing a primary action label
  withdrew **Card link** from the sidebar, turned the canvas wrapper from
  `<a class="promo-cardlink">` into the plain block container, and raised the
  notice "The card link is ignored while either action has a label". Clearing
  the label brought the field, the stored `../resolveuid/...` value and the
  whole-card click all back. The value survived hidden, as designed.
- **Both image paths land and round-trip.** Picked an existing Image through the
  widget's browser (a row click only previews; the `"<name> auswaehlen"` button
  commits), and **uploaded** a new PNG through the widget's own dropzone, which
  created `/Plone/ticket14-upload.png`. Both stored as `../resolveuid/<UID>`,
  both re-derived on load with `image_field`, `image_scales` and a `base_path`,
  both served on the public page. Note the widget persists **only** `image`: its
  `patchSelectedImageBlock` writes `image_scales` solely into an `@type: image`
  block, so it misses the promo — which is what ticket 10 wants, since the
  transformer is the sole source.
- **Deleting the target degrades rather than throws.** With the uploaded Image
  deleted, the page still renders 200 and that promo drops from
  `has--align--right` with a `<picture>` to `has--align--center` with none.

### The image field is the host's, and stays that way

Ticket 13 handed over "the image field renders with no label". It is worse than
that, and the reason is in the source: `BliccaImageWidget` declares a `value`
prop and **never reads it**, rendering only `PatternHost`. So the control is
**write-only** — no label, and no indication of which picture is currently
chosen. Live, the sidebar's Default fieldset is Kicker / Title / Description /
a bare "Auswaehlen oder Hochladen" button / Image placement, and every other
field carries a `name` matching its schema key while this one carries none.

**Decided: report upstream, work around nothing.** Three reasons. The block's
own fields are all named (`align`'s icon radios are unlabelled individually but
the group is "Image placement" with a description), so the gap is this widget's
alone. Wrapping it in a `promo_image` would cost the host's upload, which is the
one thing naming the field `image` was chosen to buy. And it is identical for
every block that takes an image in either host, so fixing it here would fix one
block and diverge from the rest of the sidebar — the same shape as the map's
already-out-of-scope "fixing `textarea` for the whole ecosystem". Written into
the README's new "Choosing the picture" section rather than into code.

### Where the two surfaces really differ — now two places, not one

The README claimed the title's weight was the only one. It is not:

1. **A replaced picture is stale in the canvas.** The picker writes `image`;
   nothing clears the load-time `image_url` the preview reads first, so a promo
   that already had a picture keeps showing the old one until save and reload.
   Verified twice, once for the pick and once for the upload. A promo with no
   picture previews the new one at once, through the reference — so the surprise
   lands only on a replacement.
2. **A deleted picture diverges structurally.** The page is centred with no
   `<picture>`; the canvas keeps `has--align--right` and previews
   `../resolveuid/<gone>/@@images/image/large`, which 404s to a zero-height
   broken image — the page's only console error — with nothing in
   `.promo-notice` to explain it. Ticket 08 accepted this as optimistic
   previewing, and its reasoning holds (the renderers agree on every node the
   server has serialized); what is new is that the disagreement covers the
   **placement class**, not only the picture.

Both are documented in the README. The decision they raise — who owns a derived
key while an author is editing — is [ticket 19](19-decide-canvas-image-freshness.md).

### Housekeeping

Two mishaps, both repaired and worth knowing. Typing into a sidebar input with
Playwright's `pressSequentially` **deselects the block and lands the keystrokes
in the canvas** — "erfahren" ended up prepended to the page title; drive the
sidebar with a native-setter `input` event instead. And the editor leaves a
`plone.locking.stealable` lock behind: `DELETE <page>/@lock` with
`{"force": true}` before any REST repair. The probe page is back to the band
plus three healthy placements, the uploaded Image is deleted, and the title is
correct.


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
