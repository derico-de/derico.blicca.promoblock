# Decide: what the canvas shows when `image` and `image_url` disagree

Type: grilling
Status: open
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
