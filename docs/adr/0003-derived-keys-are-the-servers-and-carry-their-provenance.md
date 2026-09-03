# Derived keys are the server's, and they carry their provenance

The Promo stores an image as a bare reference — `../resolveuid/<UID>` in Blicca,
an absolute `@id` in Aurora. Neither is usable as an `<img src>`, so the
serializer resolves it on load into three **derived keys** (`image_url`,
`image_scales`, `image_field`), and the deserializer strips them on save. They
never reach disk. The public renderer reads them; the editor canvas reads them
too, as the first rung of `imageSrc`'s ladder.

That works exactly as long as nobody edits. The keys are stamped at **load**,
the picker writes `image` at **any time**, and nothing recomputes them in
between — `Field.tsx` drops the widget's `extras`, and Blicca's node-patching
side channel gates on `@type === 'image'`, so for a `promo` it never fires. Two
divergences follow, and they are not symmetrical:

- **A picture replaced.** The load-time `image_url` still describes the *old*
  picture and still wins rung 1, so the canvas keeps previewing a picture the
  author has just replaced. It looks fine and is wrong.
- **A picture whose target was deleted.** The serializer emits no `image_url`,
  so the server draws the no-image layout — no `<picture>`, `has--align--center`.
  The canvas cannot tell that from a picture picked one second ago, keeps the
  stored placement, and previews a reference that 404s. It looks broken and is
  broken.

The second was accepted early as "the canvas previews optimistically and
self-corrects", on the reasoning that the renderers agree on every node the
server has serialized — which is true, and which quietly concedes that the
window where they disagree is the entire time an author is working.

The tempting fix is to let `edit` clear the stale keys when `image` changes.
It works, and it costs the thing that makes the editor half legible: `edit`
currently writes **nothing** to the document, a rule that exists because a
generic block has no copy worth seeding, and which is pinned by a test whose
`onChangeBlock` throws. Buying image freshness with a writer means every future
reader has to ask which writes are legitimate, and the answer — "only the ones
that invalidate derived state" — is a distinction nothing in the code enforces.

The root problem is not staleness. It is that a derived key arrives **anonymous**:
it says what the server computed and not what it computed it *from*, so no
reader can tell a fresh key from a stale one, or a resolved-to-nothing from a
never-loaded. Both divergences are that single missing fact, seen from two
directions.

## Decision

**Derived keys belong to the server alone. The client never writes one — it
decides whether to trust one, and it can only decide because every derived key
set carries the reference it was derived from.**

1. **One writer.** The serializer stamps derived keys; the deserializer strips
   them; no client-side code writes or clears one, ever. `edit` keeps its
   no-writer rule intact, and the throwing-`onChangeBlock` test keeps meaning
   exactly what it says.

2. **Provenance is part of the set.** `image_ref` — the **normalized** stored
   reference, the output of `stored_image()` — joins `DERIVED_FIELDS` and is
   stripped on save like the others. The client compares it against its own
   `storedImage(data.image)`, so the check reuses an existing parity pair rather
   than minting a third spelling of the normalization.

3. **Provenance is emitted even when nothing resolves.** The branches that
   return no `image_url` — a dangling reference, content carrying no image —
   still stamp `image_ref`. This is the half that does the work: *stamp present,
   `image_url` absent* means **the server looked at this exact reference and got
   nothing**, which is a fact the client previously had no way to learn.

4. **A mismatched stamp means the keys are not about this value.** The client
   ignores the whole derived set and falls through to its own rule over the raw
   reference — which is the optimistic preview, and is correct, because a
   just-picked picture is overwhelmingly the common case.

5. **A matching stamp with no `image_url` is a dead reference, and both surfaces
   draw it the same way.** The canvas renders the no-image layout —
   `has--align--center`, no `.promo-image` — and names it in `.promo-notice`.
   The notice is only honest under this rule: without provenance it would fire
   on every freshly picked image, which is why `warnings()` was right to omit it
   before and right to carry it now.

## Consequences

- **Anatomy parity gets stronger, not just image handling.** `effectiveAlign`
  now agrees across both surfaces for every node the server has serialized,
  including the dangling case where it previously did not. The parity claim
  stops carrying a stated exception.
- **The payload grows a key that looks redundant.** `image_ref` echoes a value
  already present in `image`, and it will read as duplication to anyone who has
  not hit the staleness. It is not duplication: `image` is what the author
  chose, `image_ref` is what the server *acted on*, and the entire mechanism is
  the case where those differ.
- **Deleting a target now reflows the canvas.** The placement snaps to centred
  the moment the promo is reloaded after its picture is deleted. That is a
  visible change with no author action behind it, and it is honest — it is what
  the visitor already gets.
- **The rule is stated about the image and is not about the image.** Any future
  derived key on any block — a resolved link target, a computed excerpt — gets
  the same contract for free, and gets it as a rule rather than a per-key
  judgement call. A derived key without provenance is the defect; the specific
  picture it happened to describe is not.
- **Four keys must now stay in lockstep across two languages.** `DERIVED_FIELDS`
  is spelled in Python and its consumers in TypeScript, and this ADR adds a
  member whose absence is meaningful. The existing parity tests are what hold
  them level; a fifth key added on one side only is the failure mode.
