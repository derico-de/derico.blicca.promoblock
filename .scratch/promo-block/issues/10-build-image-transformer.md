# Build: the image serialization transformer pair

Type: build
Status: open
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

<!-- fill in -->
