# Decide: does the seam grow a context axis for the title scale?

Type: grilling
Status: resolved
Blocked by: —

## Question

[Ticket 16](16-derico-token-line.md) found the one want a theme cannot express
through the seam, and it is not a missing property — it is a missing **axis**.

`--promo-title-size` is a single value inherited from `:root`, and derico wants
two:

- a promo standing in for a **section band** (reference case A, `blockWidth:
  full`, on a background slot) wants the design's `--text-heading` step —
  measured at 56px against the real contact band, which is what
  [ticket 13](13-verify-reference-case-imageless.md) set;
- a promo used as a **card** (reference case B, default width, image beside the
  copy) wants the component step, `--text-title` — because the heading step put
  a 56px title on half a column, three lines deep, on
  `/Plone/promo-band-probe`.

Ticket 16 shipped the card step, on the design source's own vocabulary
(`--text-heading` is `.page-hero h1` / `.section-heading` / `.contact-band h2`;
every component heading is `--text-title`) and because a promo is a block an
author drops on a page. So the band case is currently **not reachable** from a
theme at all.

The decision:

1. **Leave it.** A promo is a card; a band-scale headline is what a page's own
   `h1` is for, and the contact band stays the chrome pagelet the map already
   rules out of scope as content. The cost is that reference case A, at
   derico's tokens, wears a card title — it is *expressible* (ticket 13 proved
   the anatomy) but not at the design's band scale.
2. **Grow ticket 04's list with a context-aware size.** The markup axis already
   exists — the wrapper stamps `has--block-width--full` — so this is a minor
   addition under the block's growth policy rather than new anatomy. Shape to
   settle: a second property (`--promo-title-size-full`?) that only the block's
   own sheet reads under the right selector, versus the block simply scaling
   the title with a container query and publishing the ramp's ends. The first
   keeps the theme in charge of both values; the second decides the *policy* in
   the block and leaves the theme one property, which is what every other row
   of the table does.
3. **Let the theme keep a token rule.** `.block.has--block-width--full {
   --promo-title-size: … }` in `derico.css` works — a custom property on an
   ancestor inherits in and competes with nothing, so the specificity argument
   the seam rests on does not apply. Rejected in ticket 16 on the theme's own
   doctrine (`test_override_minimality` admits one non-token rule and this is
   not it), but it is the option that needs no upstream change, and
   `test_promo_seam.py` currently fails it by design — so choosing it means
   deliberately relaxing that guard.

Whichever wins, the block's README growth policy and its property table are
part of the deliverable: adding a property is minor, and **changing a default
is breaking**, so option 2 must not move `1.75rem`.


## Answer

**The axis is not built, and the shape it would take is pinned so the decision
does not have to be made twice.** The seam keeps publishing exactly one title
size. What changed is not the answer to option 1 — ticket 16 already suspected
it — but the *reasons*, two of which turned out to be the opposite of what this
ticket assumed.

### The mechanism objection collapsed, and then stopped mattering

This ticket weighed options 2 and 3 as if both were portable. They are not.
**`has--block-width--full` is a Blicca-only class.**
`plone.blicca.auroraeditor/wrapper/src/editor/plone-block-width.tsx:25-27` says
so in its own words — *"Aurora's width machinery only sets the inline
`--block-width` custom property"* — and Blicca adds the class as an additive
plugin on top; `browser/rendering/plate.py:437` mirrors it for the public view.
In Aurora proper there is no `has--block-width--*` class at all, only an inline
custom property, which CSS cannot compare against a value. So the markup axis
this ticket called "already there" is there in **one** of the block's two hosts.

That reads as disqualifying, and it was the recommendation put to the user. It
was **overruled, deliberately and as standing policy**: Aurora is incomplete,
Blicca is where the work lands, and an Aurora gap defers rather than vetoes —
Blicca first, Aurora where it can, postponed where it cannot. Recorded on the
map's Notes as a standing preference for the whole effort (see below), because
it contradicts how several resolved tickets reasoned and should not be
re-litigated one ticket at a time.

So the axis is buildable. It is simply not wanted yet.

### Why it is not built

**No page is asking for it.** The band case has never been authored. It exists
as `/Plone/promo-band-probe`, a fixture ticket 16 stood up to *measure*, and
ticket 13's job was to prove the anatomy reproduces at that scale — which it
did, and which was the whole of what reference case A was for. The map already
rules "turning derico's contact band into content" out of scope and names the
band **"a [[reference case]], not a migration target"**; the page-level
band-scale headline is what a page's own `h1` is for. Ticket 04's growth policy
makes adding a property a **minor** release, so this stays cheap on the day
someone authors the page. Building it now would be building a seam axis for a
probe.

### The shape, pre-decided

If the demand arrives, the answer is **option 2a**, not 2b and not 3:

- **`--promo-title-size-full`**, read by the block's own sheet under
  `.block.has--block-width--full`. The theme states *both* scales; the block
  says only which context reads which. That is the discipline every other row
  of the property table keeps — one value per property, **no policy in the
  block**.
- **Not 2b (a container-query ramp).** Host-agnostic, and available today
  (`.promo` is already an inline-size container, `styles.css:89`, and
  `.promo-title` is a descendant so the "a container cannot query itself" cost
  does not apply). Rejected anyway: it buries a breakpoint the theme can only
  fight with a rule, which is the thing [ticket 04](04-decide-the-theme-seam.md)
  spent itself preventing. `--promo-measure` is forced to stop a layout defect;
  a type ramp is taste, and taste belongs to the theme.
- **Not 3 (a theme rule).** It moves a block concern into `derico.css` and
  requires deliberately relaxing `test_promo_seam.py`'s **per-rule** guard —
  which ticket 16 wrote precisely to catch
  `.block.has--block-width--full { --promo-title-size: … }`, by rule and not by
  name, after mutation-checking found that a name-set comparison could not see
  it.
- **Rule 3 of the road gains a documented exception**, not a quiet violation.
  `styles.css:26-32` forbids selecting on the host's wrapper stamp. The reason
  it forbids it is that the stamp is *unverifiable* — and this one is verified,
  in both Blicca surfaces, by the two files cited above. Whoever builds this
  writes the exception down where the rule is stated, with those citations.
- **`1.75rem` does not move.** Changing a default is breaking (growth policy);
  `--promo-title-size` keeps its literal and the new property is additive.

### The constraint the builder needs

Only **`full`** is expressible. `plate.py:437` emits `has--block-width--<value>`
for *every* width on the published page, but the canvas plugin adds the class
**only when the value is `full`** (`plone-block-width.tsx:44-47`). A `full`-only
axis therefore agrees across both Blicca surfaces; a general per-width axis
would work on the page and silently not in the canvas — which would break
canvas↔page parity, the one thing this block has spent twenty tickets holding.
This is why the pre-decided property is `--promo-title-size-full` and not a
family.

### What was written

No code. `README.md` gains one bullet under "Not themeable, on purpose"
recording that the seam publishes a single title size and why; the map gains
the Blicca-first note and this decision. No property, no rule, no test change —
`seam-lockstep.test.ts` and `test_promo_seam.py` are both untouched and stay
green, which is itself the check that nothing was built by accident.
