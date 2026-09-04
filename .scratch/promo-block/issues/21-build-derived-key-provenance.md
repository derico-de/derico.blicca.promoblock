# Build: the derived-key provenance stamp

Type: build
Status: resolved
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

**Built (246 Python tests, 257 vitest, typecheck and build green); the stamp
went one level up from where this ticket put it, and the strict reading of the
provenance check cost a test habit that turned out to be fiction.**

### Where the stamp lives, and why not where the ticket said

The ticket asked `resolve_image()` to stamp `image_ref` in every branch that
has a reference. It went to the serializer's `__call__` instead, on the line
after the `if not stored: return value` guard and **outside the `try`** — so
the stamp is emitted for the exception branch too. That branch exists because
one unresolvable image must not break a whole page's serialization; it logs and
falls through, and the page a visitor gets is the no-image layout. Left
unstamped it would have read to the canvas as *never loaded*, and the canvas
would have previewed a picture the public page does not show — which is the
exact divergence this ticket removes, reintroduced through the one door nobody
was looking at. Mutation-proved rather than argued: moving the stamp after the
`update()` inside the `try` passes all 245 other Python tests and fails only
`test_a_resolution_that_blows_up_still_stamps`.

Consequence for the branches the ticket did enumerate: they need no change at
all. `derived_image_fields()` still returns `{}` for a dangling reference and
for content carrying no image, and the stamp is beside it either way — so
*stamp present, `image_url` absent* is one rule with one implementation, not
three branches that each have to remember it.

### The client check is strict, and that invalidated a test habit

`imageSrc`'s rung 1 became **rung 0**: `derivedAreCurrent(data)` — the stamp
against this side's own `storedImage(data.image)`, the existing parity pair —
and a match makes the derived set final **including its emptiness**. No stamp
means the whole set is ignored, not merely a mismatched one, because ADR 0003's
defect is anonymity: a derived key with no provenance is precisely the thing
the client must not trust. It cannot occur in production anyway — nothing but
this serializer writes one, and it always stamps.

What that broke is worth recording, because it was hiding something. Several
tests, in three files, spelled "this promo has a picture" as `{ image_url:
'/p' }` — **a node no serializer can emit**, since `image_url` only ever
appears where `image` is set. Under the strict check they render no picture at
all. They are now spelled as a `SERVED` node — reference, stamp and resolved
URL together — which is what the server actually hands the canvas. The fixture
had the same habit in the other direction and gained the stamp in every picture
case.

### The parity exception moved rather than vanished

`image-dangling-reference` **lost its `reactOnly`**: it is stamped now, both
renderers draw the no-image layout, and the parity claim drops the exception it
used to state — as the ticket predicted. But `reactOnly` is not dead machinery,
and pretending it was would have been the dishonest way to close this. A 26th
case, **`image-just-picked`**, is its honest home: `image` set, no derived set,
no stamp — the node the server has *never* serialized, which the canvas
previews optimistically and the server would draw as no image at all. So the
exception moved from *a dangling reference* (a node the server serializes, and
therefore inside the parity claim) to *a node no serializer emits* (outside it,
which is what "the renderers agree on every node the server has serialized"
always said). Both suites read the new case; the Python one asserts the
server's `html` for it, as it does for every case.

### Two mistakes, one notice each

`warnings()` could not simply gain a row. A value that fails the image screen
(`javascript:…`) and a reference the server confirmed dead both reach the same
`picture && !hasImage` branch, and they are different mistakes with different
fixes — a typo the author can retype, versus a picture somebody deleted out
from under this promo. The screen wins where both would apply, so a stamped
`javascript:` value still gets *"is not a kind of picture this block can show"*
and never a deletion notice. An unstamped reference still says nothing at all,
which is ticket 08's rule and is still right.

### The lockstep the ADR asked for did not exist

ADR 0003's last consequence says four keys must now stay level across two
languages and that *"the existing parity tests are what hold them level"*. They
did not: `DERIVED_FIELDS` was spelled in Python only, and the TypeScript side
knew the keys as three optional fields on a type and one hardcoded list in a
test. Fixed properly — `data.ts` exports `DERIVED_KEYS`, the schema suite reads
it (so it is production code with a consumer, not a test constant), and
`TestScreenParity` gained `test_the_derived_key_set_matches`, Python-reads-TS
like the rest of that class. Mutation-checked: a fifth key added to the TS list
alone fails it.

### Everything else

- **No upgrade step**, confirmed against the project rule: nothing here is
  stored, no profile XML, registry record or GenericSetup artifact changes.
  Round-trip identity still holds — the deserializer strips the fourth key with
  the other three, and dropping it from `DERIVED_FIELDS` fails 5 tests.
- **README**: both passages rewritten. "A freshly picked picture does not
  appear until the next load" is gone from the widget's list of surprises —
  it was never the widget's shape — and is replaced by a short account of what
  is derived, what `image_ref` is for, and the three author-visible rules that
  follow. "Where the two surfaces really differ" is down to one entry, and the
  sentence elsewhere calling the title's weight "one of the two places" was
  corrected in the same pass rather than left to go stale.
- **CONTEXT.md** gained **Derived key** and **Provenance stamp**. Ticket 19
  decided the rule and named neither; the block now has two more terms whose
  `_Avoid_` lines rule out the readings that would undo them (cache key, etag,
  version — nothing here is compared for *age*, only for identity of the source
  value).
- **Every guard mutation-checked, with a passing control**: rung 0 made
  unconditional (9 vitest failures), a matching stamp with no URL falling
  through instead of stopping (7), the dead-reference notice removed (2) and
  the same notice fired without the stamp (2); server-side, the stamp removed
  (12 Python failures), stamped only on success (1), and `image_ref` dropped
  from `DERIVED_FIELDS` (5).

**Not verified live.** Plone is not running in this environment and the project
rule is not to start one unasked. Everything above is unit-level on both sides,
and the replacement case is the one an author actually experiences — ticket 14
found it *on* a running site and wrote it into the README as a limitation, so
the README's new claim is the one thing here that has never been looked at in a
browser. Raised as [ticket 22](22-verify-canvas-freshness-live.md).
