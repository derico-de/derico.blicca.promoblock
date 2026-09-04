# Verify: the canvas follows a replacement and a deletion, on a running site

Type: verify
Status: resolved
Blocked by: 21

## Question

[Ticket 21](21-build-derived-key-provenance.md) changed what an author sees in
`@@aurora-edit` the moment they replace or lose a picture, and every assertion
behind it is unit-level — jsdom on one side, an integration transformer on the
other. The thing it fixed was **found on a running site**: ticket 14 measured a
replaced picture staying stale in the canvas and ticket 13 measured the
surfaces' other differences, and both wrote their findings into the README as
limitations. Ticket 21 then rewrote those passages. That claim is the one part
of the block currently resting on nothing a browser has confirmed.

Reproduce on `/Plone`, with the block's built artifacts installed:

1. **A picture replaced.** A promo with `left` placement and a picked image;
   save, reload, then pick a *different* image. The canvas must show the new
   picture immediately — no save, no reload — and no `.promo-notice` appears.
2. **A picture deleted.** Delete the target of a saved promo's image, then
   reload the edit page. The canvas must reflow to the no-image layout
   (`has--align--center`, no `.promo-image`) and carry the "no longer exists"
   notice; the published page must show the same layout.
3. **Nothing is written.** Neither case may dirty the document: the promo's
   stored JSON after 1 and 2, read back through the REST API, still carries
   `image` and no derived key. This is ADR 0003's whole reason for choosing
   provenance over letting `edit` clear the stale keys, and a live check is the
   only place a stray `onChangeBlock` from the host would show up.
4. **The stamp is really on the wire.** `GET` the page's blocks as JSON and
   confirm `image_ref` arrives beside `image_url`, and that a promo whose image
   was deleted carries `image_ref` **without** `image_url` — the fact the whole
   mechanism rests on.

Plone runs on `0.0.0.0:8081`; it was not running when ticket 21 was worked, and
the project rule is to ask rather than start one.

## Answer

**All four checks pass on the running site, and the canvas told us something no
unit test could: the notice was quoting a UID the author has never seen.**

Fixture: `/Plone/promo-freshness-probe`, an Article with two `left`-placement
promos and three purpose-made Images — `promo-fresh-before` (red 300×100),
`promo-fresh-after` (blue 160×240) and `promo-fresh-doomed` (green 300×100).
Deliberately its own page rather than ticket 13/14's `promo-band-probe`, whose
evidence must not be disturbed, and deliberately three *new* images so deleting
one breaks nothing else. The two source pictures differ in colour **and aspect
ratio**, so "which picture is on screen" is answerable from the rendered
`naturalWidth`/`naturalHeight`, not from a URL string that might merely look
right.

### 1. A picture replaced — the canvas follows immediately

Driven through the real picker (select the block → the sidebar's "Auswählen
oder Hochladen" → the content browser's preview row → its commit button), with
no save and no reload. The `<img src>` went from
`/Plone/promo-fresh-before/@@images/image-300-<hash>.png` to
`../resolveuid/8e774c00…/@@images/image/large` — rung 1 dropped for rung 2, which
is the stamp mismatch working — and the browser really loaded it:
`naturalWidth/Height` read **160×240**, the blue picture, not 300×100. Before
ticket 21 the first URL would still have been there. After saving, the stored
node carries the new reference and the next load re-derives a matching
stamp/URL pair off the new picture (`image-160-<hash>.png`).

### 2. A picture deleted — both surfaces draw the same thing

`DELETE`d the target, reloaded `@@aurora-edit`: the promo reflows to
`promo has--align--center`, emits no `.promo-image`, and carries the notice.
The published page, fetched **anonymously**, emits the identical root classes
and no `<picture>` — checked element for element against the canvas, and the
notice does not leak onto it. Zero console errors on either surface.

### 3. Nothing was written

Every request the edit page made while the picture was replaced was a `GET` —
no `POST`, no `PATCH`, no `@lock` traffic against `promo-freshness-probe`.
Among them is a `@search` by UID asking for `image_field`/`image_scales`, which
is Blicca's node-patching side channel looking — and **not** patching, exactly
as ticket 01 said it would not for a non-`image` block. The proof that it
didn't is the src itself: had the side channel written the derived keys, the
canvas would have shown a resolved scale URL instead of the raw reference.

Stated honestly, because a verify ticket should not overclaim: *"the saved node
carries no derived key on disk"* is **not** observable through the REST API by
construction — the serializer strips-then-derives on every read, so disk and
wire cannot be told apart from outside. That half stays where it already was,
in `TestRoundTrip`'s serialize→deserialize identity. What a live run adds is the
network-level fact above, which no unit test can reach.

### 4. The stamp is on the wire, in both shapes

Read from the REST payload as **admin and as an anonymous visitor**, which
matters because the two resolution paths genuinely differ (ticket 10's
`PrimaryFileFieldTarget` finding):

- resolved: `image_ref` == `image`, `image_url` present;
- dangling: `image_ref` == `image`, **`image_url` absent** — the shape the whole
  mechanism rests on, emitted by the branch that used to return `{}`.

### The finding: the notice was quoting a UID

The sentence read *The picture "../resolveuid/bd7fb2316a434f34afcbcfb368af6b3b"
no longer exists…* — technically true and useless. This case is only ever
reached through a **picked** reference (an author-typed URL is emitted whole and
never dangles), so the quoted string is one the author has never seen and cannot
act on, and the picture that would have supplied a title is deleted. Changed to
*"The picture this promo points at no longer exists, so it renders without one."*
The neighbouring "is not a kind of picture this block can show" sentence
**keeps** its quote, because there the value is exactly what the author typed —
the asymmetry is the point, and the test now pins it (the dead-reference sentence
must not contain the reference). Rebuilt, reloaded, confirmed live.

### Observations, neither of them this ticket's

- **Two notices for one deletion.** The dead-reference sentence is followed by
  "The image placement is ignored: there is no image to place" — Q8 row 7 firing
  correctly, because the stored `align: left` really is orphaned now. Two
  sentences about one event reads as noisy, but each is true and the second tells
  the author their placement returns if they pick a new picture. Left alone.
- **The block upscales a small picture to fill its track.** The 160px-wide test
  image renders 454px wide, because ticket 11's sheet sizes `.promo-image` from
  the grid track. A fixture artefact — a real photograph does not hit it — but
  it is the first time the block has been seen with a source narrower than its
  column.

Ticket 13/14's finding that the image widget is **unlabelled and shows no
current selection** was seen again in passing, unchanged, and is still
out of scope on the map as an upstream report.

Screenshot: `.scratch/promo-block/ticket22-canvas-freshness.png` — the blue replacement
beside its copy, and the centred, pictureless promo with both notices.
