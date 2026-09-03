# Build: the image serialization transformer pair

Type: build
Status: resolved
Blocked by: 03

## Question

**Ticket 01 confirmed this transformer is the *only* source of scales, not
merely the preferred one.** `Field.tsx` passes `onChange` a single argument and
discards the widget's `extras`, and Blicca's node-patching side channel gates on
`@type === 'image'`, so it never fires for `promo`. Neither host persists
`image_scales` or `image_field` by any route. Corollary for ticket 09: both
renderers must still degrade cleanly when the transformer has not run.

The image is stored as a reference, and both the editor canvas and the server
`<picture>` need scales. Contract §5.3 makes that a transformer, and derived
data is **never persisted**.

- **`IBlockFieldSerializationTransformer`** resolving the stored URL to
  `image_scales` / `image_field`, registered for **both** `IBlocks` and
  `IPloneSiteRoot` — restapi's `NestedBlocksVisitor` recurses into the
  somersault value and fires the same handlers on restapi GET and on classic
  rendering, which is what keeps editor and public renderer seeing identical
  data. Worked example: `listing_transform.py`.
- **A paired `IBlockFieldDeserializationTransformer`** stripping every injected
  field on write. Unpaired, the derived data persists and goes stale.
- **Handle both stored forms** ticket 01 identifies (`@id` absolute vs
  `../resolveuid/<uid>` relative), and a value that resolves to nothing —
  a deleted image must render the no-image layout, not an exception.
- **Only the image.** CTA and card links are *not* transformed: the picker
  stores an object carrying `@id`, so both surfaces read the URL without a round
  trip, and adding link resolution would mean more fields to strip for no gain.
- Tests: round-trip a block through serialize → deserialize and assert the
  persisted value is byte-identical to what went in. That test is the pair's
  whole point.

## Answer

**Built, 31 tests green.** The pair lives in
[`image_transform.py`](../../../src/derico/blicca/promoblock/image_transform.py),
registered as four subscribers in the package `configure.zcml` (serializer and
deserializer × `IBlocks` and `IPloneSiteRoot`), both at `order = 200` on the
add-on's **own** browser layer. `PROMO_BLOCK_TYPE` moved into a new
[`blocks.py`](../../../src/derico/blicca/promoblock/blocks.py) so the type name
is spelled once for this pair, ticket 09's view name and ticket 12's record.
No GenericSetup profile XML changed, so no upgrade step is due.

### The injected keys are **three**, not two

`image_scales` and `image_field` alone are not renderable. `image_source()`
joins `base_path` (or the item's `@id`/`url`) to the entry's relative
`download`, and a promo block has **no `@id`** — its picture always lives on
another object. So:

| key | what it holds |
|---|---|
| `image_scales` | the target's catalog metadata, with **`base_path` stamped into every entry** — the full site path (`/plone/pic`), which is the form Blicca's helpers join, not `plone.volto`'s portal-relative spelling |
| `image_field` | `image` when present, else the sole key — the same rule `image_source()` would infer, made explicit |
| `image_url` | always directly usable as an `<img src>`: the original-size download where there is one |

`image_url` is the addition this ticket's question did not anticipate, and it
is what lets ticket 09 tell the three no-scales cases apart:

- **present, external** → the author typed a URL. Emitted **whole** —
  `path_of()` would strip the host off a genuinely external image.
- **present, internal** → an SVG or anything `image_source()` declines to
  scale. The plain-`<img>` fallback has somewhere to point.
- **absent entirely** → the picture is gone (dangling reference) or the
  reference names content carrying no image. **Draw the no-image layout.**

Without the third key the renderer would have to re-derive the distinction
from the raw string, and a deleted image would render `<img
src="../resolveuid/…">` — a guaranteed 404 rather than the no-image layout
this ticket asked for.

### Resolution composes two restapi helpers rather than re-implementing either

`path2uid(context, link)` normalises an absolute `@id` or a `/path` into a
resolveuid reference — **following renames through the redirection storage**,
which we get for free — and returns an external URL unchanged. `resolve_uid()`
then turns that into `(url, brain)`. A value already matching
`RESOLVEUID_RE` skips the first step. One rule covers all four stored forms
ticket 01 found, plus the legacy `{'@id': …}` / `[{'@id': …}]` shapes
upstream's `normalizeImageValue` reads (we accept them; we never write them).

**A dangling reference returns `("", None)`, not the raw string** — that is the
one place this deliberately exceeds what restapi's own image block does.

### The finding worth carrying forward: the brain is not guaranteed by design

`resolve_uid()` returns a brain **only because** it fails to find an
`IObjectPrimaryFieldTarget` for an Image. It does find
`DexterityObjectPrimaryFieldTarget` (registered for all `IDexterityContent`),
which looks up `IPrimaryFieldTarget` on the primary field — and an Image's
primary field is `INamedBlobImageField`, which descends from
`INamedImageField` and **not** from `INamedFileField`, so restapi's
`PrimaryFileFieldTarget` does not apply and the default adapter returns
`None`. Had it applied, `resolve_uid()` would return `(download_url, None)`
and **every promo would silently lose its scales**.

The trap: that adapter short-circuits on `ModifyPortalContent`, so it is inert
for anyone who can edit — which is every other test in the suite and every
developer poking at it by hand. **Only a visitor exercises it.** The failure
would have shipped green and broken for the public alone. Pinned by
`TestAnonymousResolution`.

### Only the image is transformed — decision kept, **reason corrected**

This ticket's question justified excluding the links with "the picker stores an
object carrying `@id`, so both surfaces read the URL without a round trip".
[Ticket 07](07-build-the-two-widgets.md) invalidated that: a picked link is a
**bare `../resolveuid/<UID>` string**, in both hosts. The decision survives on
a different footing — a relative `resolveuid` href is followed by Plone's own
public `for="*"` view on the server surface and is inert on the editor canvas,
which is a preview — so no transformer is needed either way, and adding one
would only mean more keys to strip. [Ticket 09](09-build-server-half.md)
already owns the resolve-or-emit call and its body states it.

### Tests

`tests/test_image_transform.py`, 31 assertions over: every stored form
(relative resolveuid, absolute `@id`, site-relative path, external URL); the
legacy dict/list shapes; the three no-scales cases; stale derived keys on a
node written before this pair existed; dispatch (claims `promo`, touches no
other type, serves the site root); the anonymous path; and the headline
**round-trip** — serialize → deserialize is the identity, asserted against
both reference cases from ticket 03 plus the absolute-`@id` and external-URL
and dangling-reference variants, with the caller's own dict proved unmutated.

Two things were verified by mutation, not merely asserted:

- **Unregistering the deserializer fails 5 tests, three of them round-trips.**
  Worth checking, because plone.restapi's own generic `ResolveUIDDeserializer`
  pops `image_scales` from *every* block dict at `order = 1` — so a round-trip
  test that only watched that key would have passed with our half of the pair
  missing entirely. It knows nothing of `image_field` or `image_url`; do not
  lean on it.
- **`base_path` is load-bearing**: `test_the_enriched_value_feeds_image_source`
  feeds the enriched value straight to Blicca's `image_source()` and asserts a
  real `src`. Without the stamp that helper returns `None`.

### Notes for downstream tickets

- **[Ticket 09](09-build-server-half.md)**: read `image_url` for the
  plain-`<img>` fallback and treat its **absence** as "no image". Do not
  re-derive a base — `base_path` is already inside every scale entry, which is
  what makes `image_source(self.data)` work directly.
- **[Ticket 08](08-build-editor-half.md)**: a **freshly picked** image has no
  derived keys until the next load — see the note added to that ticket.
- **Ticket 15**: the enrichment runs wherever the block is serialized, so the
  vitest/jsdom harness sees whatever fixture it is handed; the keys are a
  server-side contract and nothing in the JS half produces them.
