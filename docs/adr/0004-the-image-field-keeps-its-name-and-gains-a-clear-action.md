# The image field keeps its name and gains a clear action

ADR 0001 §4 took a deliberate exception for the image: the schema property is
called `image` **so that field-id resolution hands it the host's own image
widget**, upload included, in both hosts and with no `widget` key. That bought
a picker this package does not have to write and does not have to port.

It also bought the host's gaps. Neither host can *unset* a picked image from a
block-settings form:

- Blicca's `BliccaImageWidget` mounts a bare `pat-contentbrowser` island and
  never reads its own `value`/`defaultValue`, so the island comes up EMPTY on
  every render pass. The selected-item chip — whose ✕ is the pattern's own
  deselect — exists only for as long as the sidebar stays open on the block
  that was just edited. Reopen it and the field is a "Select or Upload" button
  with no indication that an image is even set.
- Upstream's `ImageWidget` does draw a preview with a bin button, but gates it
  behind `selected`, a prop `BlockSettingsFormRenderer` never passes.

So the promo's image was one-way in both hosts, and `align` — offered only
while an image is set — was stuck on with it. A block whose every field is
optional (ADR 0001 §3, nothing is `required`) had one field that could not be
emptied.

## Renaming the field was not available

The obvious repair is derico-hero's: call the field something else and register
a widget for that name. It is wrong here for reasons that have nothing to do
with taste. `image` is the name **on disk**; `image_transform.py` reads it, the
derived-key set is named after it, and the whole point of the spelling is that
a teaser↔promo migration stays a rename-free copy. Changing it would need a
data migration to buy a button.

## The `id` lane

`Field.tsx` resolves a widget in a fixed order, and `getWidgetByFieldId(id ??
name)` runs **first and unconditionally**. That is what makes a field called
`image` take the host's image widget, and it is also why a `widget:` key on
such a field is never consulted — the lane below it is unreachable.

The same line is the way out. The schema declares `id: 'promo_image'`, and the
field-id lane resolves *that* instead. Nothing else reads it:
`BlockSettingsFormRenderer` passes `name={field.name}`, so the value still
writes to `image`, and the stored shape is untouched.

`promo_image` is a **wrapper, not a replacement**. It looks the host's widget up
as `config.getWidget('image')` at render — the same argument `promo_link` makes
for `object_browser`: neither implementation can be imported from a block
add-on and stay portable, and each works in its own host. The upload never
left. What the wrapper adds is a label (Blicca's widget renders none, so the
promo's image row was previously unnamed), a thumbnail of what is actually
stored, and a **Clear** button that writes `null` — the empty value both hosts
write and both halves of this block already read.

Clearing also remounts the host widget. Blicca's pattern island keeps its
selected-item chip in Svelte state that nothing outside can reach, so without
the remount the sidebar would go on showing a chip for an image the block no
longer has.

## What this costs

One more indirection between the schema and the host's widget, and one more
place that has to keep working when either host's image widget changes shape.
The wrapper consumes exactly one thing from it — `onChange(value, extras)`,
whose `extras` `Field.tsx` drops anyway — so the surface is as narrow as the
lookup allows.

ADR 0001 §4's exception stands in substance: the host's image widget is still
what picks and uploads, and the field is still named `image`. Only the entry
point moved.
