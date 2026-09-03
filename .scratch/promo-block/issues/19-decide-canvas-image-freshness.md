# Decide: what the canvas shows when `image` and `image_url` disagree

Type: grilling
Status: resolved
Blocked by: —

## Question

Ticket 10 injects `image_url` on **load** and strips it on **save**; ticket 08's
canvas preview reads `image_url` first. The two are therefore in step only
between a load and the next pick — and [ticket 14](14-verify-reference-case-image-left.md)
watched both ways they fall out of step on the running site:

- **A picture replaced.** The author picks a new image; the picker writes
  `image` and nothing clears the load-time `image_url`, so the canvas keeps
  showing the **previous** picture until save and reload. (A promo that had no
  picture previews the new one at once, through the reference — so the surprise
  lands only on a replacement.)
- **A picture deleted.** No `image_url` comes back, so the server draws the
  no-image layout — no `<picture>`, and `has--align--center`. The canvas keeps
  the stored placement and previews the reference, which 404s to a zero-height
  broken image, with nothing in `.promo-notice` to say why.

Ticket 08 accepted the second as "the canvas previews optimistically and
self-corrects", on the reasoning that the renderers agree on every node the
server has serialized — which holds. What ticket 14 adds is that the divergence
is **structural**, not just a missing picture: the two surfaces disagree about
the placement class, and the author gets no signal in either case.

The decision, not the fix:

- Does the editor half clear the derived keys when `image` changes, so the
  ladder falls through to the reference and the canvas is never stale? Ticket 08
  deliberately seeds nothing and pins that with a throwing writer prop, so this
  is a reversal to take consciously if at all.
- Is a dead reference something `.promo-notice` should announce, the way it
  announces every other value the renderers drop — or is a broken picture
  already self-explanatory?
- Or is the honest answer that both are documented (they now are, in the
  README's "Where the two surfaces really differ") and neither is worth a
  mechanism?

Whatever is decided, the ADR-worthy part is the general rule: **who owns a
derived key while an author is editing.**

## Answer

**Both are fixed, by one mechanism, and the editor gains no writer.** Decided
with md@derico.de on 2026-09-03. The general rule is
[ADR 0003](../../docs/adr/0003-derived-keys-are-the-servers-and-carry-their-provenance.md):
*derived keys are the server's, and they carry their provenance.*

The ticket offered three options and the answer is none of them exactly. The
first (clear the derived keys from `edit`) buys freshness with a writer, and
`edit`'s no-writer rule is what makes the editor half legible — it is pinned by
`promo-edit.test.tsx:55`, whose `onChangeBlock` throws. The third (document both,
build nothing) survives only while the two cases are indistinguishable. The
grilling found they need not be.

**The reframe.** The root problem is not staleness, it is that a derived key
arrives **anonymous**: it reports what the server computed, never what it
computed it *from*. The canvas cannot correlate `image_url` (`<path>/<download>`)
with `image` (`../resolveuid/<UID>`) — no shared spelling — so it cannot tell a
fresh key from a stale one, nor a resolved-to-nothing from a never-loaded. Both
divergences are that one missing fact seen from two directions.

**The mechanism.** A fourth derived key, `image_ref`, carrying the **normalized**
stored reference (`stored_image()`'s output), stripped on save like the other
three. The client compares it to its own `storedImage(data.image)` — an existing
parity pair, so no third spelling of the normalization. Emitted **whenever
`image` holds anything**, including the branches that currently `return {}`;
that is the half that does the work, because *stamp present, `image_url` absent*
is how the client learns the server resolved this exact reference to nothing.

- **Replacement staleness** — stamp stops matching, the whole derived set is
  ignored, the canvas falls to its own rule over the raw reference and previews
  the new picture at once.
- **Dangling reference** — stamp matches with no `image_url`, so the canvas draws
  the **no-image layout** (`has--align--center`, no `.promo-image`) and names it
  in `.promo-notice`. `warnings()` was right to omit this before and is right to
  carry it now: the same notice without provenance would fire on every freshly
  picked image.

**A ranking was inverted along the way.** The README files the replacement case
under the image widget's shape and the dangling case under "where the two
surfaces really differ" — but a dangling reference looks broken and *is* broken,
so the author gets a signal, while a replacement looks fine and is **wrong**.
The confidently-wrong case was the lesser-documented one. Both README passages
are rewritten by the build ticket.

**What it costs.** Anatomy parity gets *stronger* — `effectiveAlign` now agrees
across both surfaces for every serialized node, so the parity claim drops its
stated exception. Nothing is stored on disk, no registry record changes, no
profile XML: **no upgrade step**, checked against the project rule that every
GenericSetup profile change needs one.

**Not built here.** This is a `grilling` ticket and the change spans the
transformer pair, `data.ts`, `PromoEdit`, `warnings()`, the vitest/pytest parity
pair and two README passages — its own session. Handed to
[ticket 21](21-build-derived-key-provenance.md).
