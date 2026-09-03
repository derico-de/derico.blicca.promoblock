# Verify: reference case A — the image-less centred band

Type: verify
Status: resolved
Blocked by: 08, 09, 11, 12

## Question

Reproduce derico.de's closing call to action as a Promo, to exercise the
image-less path end to end: kicker empty, title "Erstgespräch vereinbaren", one
sentence of description, no image, `center` placement, `blockWidth: full`, a
band background, primary action `variant: button`, secondary action
`variant: link` pointing at a **`mailto:`**.

- **It must render on both surfaces** — the canvas and the public page — and
  look the same.
- **The `mailto:` is the point.** This is where `path_of()`'s scheme-stripping
  would bite; ticket 09's screening rule is verified here or it is not verified.
- **The band itself is not migrated.** It stays a chrome pagelet
  (`plonetheme.derico/templates/contact.pt`), deliberately identical on every
  page. This ticket proves the block *could* express it, which is evidence the
  block's shape is right — it is not a plan to replace the band.
- **A reference case is evidence, never specification.** If reproducing it
  exactly would require an option the block does not have, the answer is the
  theme seam or a deliberate new option — not a derico-shaped special case in
  the block.
- Record the result as a real test, not a screenshot in a comment: the house
  rule is real tests over verification scripts.

## Answer

**Reproduced on both surfaces, and it needed nothing the block does not have —
but the thing ticket 11 asked to watch turned out to be two things, and the
README was wrong about the second.** The band is expressible as a Promo: same
anatomy on the canvas and the public page, the `mailto:` survives the whole
pipeline, and every remaining difference from the real pagelet is a token, which
is ticket 16's line and not a change to the block.

### What holds it, as tests

- **The band is now the fixture's 24th case**, `reference-case-the-contact-band`
  — the node authored word for word off `contact.pt` as it renders on the
  running site. Both renderers are therefore already held to it exactly and as
  a skeleton, and to the editor surface (the same markup with every `href`
  dropped). It carries `blockWidth` and `backgroundColor` **in the data**, so
  the case also states that the block emits nothing for either.
- **`bundle-src/test/promo-schema.test.ts` gained the authorability block** (4
  tests). The fixture says the two renderers agree; it cannot say an author
  could ever have typed the node. This does: every field the band carries is
  offered by `PromoSchema` for the band's own form data, `align` and `card_link`
  are correctly withdrawn, and `backgroundColor` is *not* offered against an
  upstream registry — so on native Aurora reference case A is the same promo
  **without a band**, by mechanism. That is the assertion that would have caught
  the failure this ticket warns about: a reference case reproduced only by
  writing JSON the sidebar cannot offer.
- **`tests/test_reference_case_band.py`** (8 tests) is the only place the whole
  publishing pipeline runs: `render_blocks` — the promised API
  `@@aurora-blocks-view` calls — over a real somersault tree, so restapi's
  serialization transforms, `PlateRenderer`'s block anatomy and
  `@@aurora-block-promo` all run in one render. It asserts the wrapper stamp and
  its custom properties, that our markup is the wrapper's **only** child (an
  equality, not three `in` checks), that the image-less band is `center`
  whatever `align` was stored, the `mailto:` reaching the page, a picked
  `../resolveuid/<UID>` resolving **beside it** in the same render, and that an
  anonymous visitor gets the identical string.
- **Deliberately not re-asserted**: the `path_of` hazard, the screen, the
  dangling reference and the typed path are already pinned at the renderer in
  `test_view_promo_block_view.TestLinks`. Repeating them here would be the same
  assertion at a longer range. What the band adds is that the code path which
  rewrote one link left the other alone.
- Mutation-checked, both directions: making `resolve_link` call `path_of`
  unconditionally fails 9 tests (4 of them this file's); renaming the fixture
  case fails 12 across the two suites, including each suite's own
  found-the-fixture guard. **210 Python tests, 176 vitest**, typecheck and ruff
  green.

### Verified live on `localhost:8081`

Authored through the REST API onto `/Plone/promo-band-probe` (an Article,
published, left in place for tickets 14 and 16), the primary action pointing at
the real `/Plone/contact` as a picked reference.

- **Public page**: the markup is exactly the fixture's inside the host's
  `block block-promo has--block-width--full has--backgroundColor--dark` wrapper;
  the picked reference resolved to `/Plone/contact`; `href="mailto:md@derico.de"`
  intact. Anonymous and authenticated renders are the same string once entities
  are unescaped — the authenticated page entity-encodes its umlauts page-wide
  (7 occurrences, the title and paragraphs too), which is the classic rendering
  path's business and not the block's.
- **Every `--promo-*` is unset**, so this is still the bare-host case ticket 04's
  literals exist for. Measured: band 1440px full bleed painted by the wrapper's
  `::before` from the theme's own `--aurora-block-bg-dark`, copy box 611px wide
  centred at x=415 (the 60ch **cap**, exactly as ticket 11 warned),
  `--promo-padding` 0 against the band's own 40px, `gap` 32px, `row-gap` 12px,
  title 28px, description 16px, button 6px radius.
- **Canvas**: the same anatomy with **no `href` on any anchor** and one added
  `.promo-incomplete` line ("Still to fill in: kicker, image.") outside the
  block root; identical metrics. The sidebar round-trips the whole band — three
  fieldsets in ticket 03's order, `blockWidth: full` checked, `Background: dark`
  selected, both variants, and **no card link** because the labels are typed.
  Zero console errors, nothing saved, no lock left behind.

### The `dark` slot, exercised at last — and the README corrected

Ticket 11 could not reach this slot and handed it here. Probed by setting
properties on `:root` live and flipping the wrapper to `accent` as a control:

| set on `:root` | on the `dark` slot | on `accent` (control) |
|---|---|---|
| `--promo-link-color: red` | ignored — band foreground | red |
| `--promo-cta-fg: #fff` | **ignored — band foreground** | white |
| `--promo-cta-bg: copper` | copper | copper |
| `--promo-title-size: 3rem` | 48px | 48px |

Two corrections went into the README, both because the site proved them:

1. The flattening rule is
   `:is(.aurora-blocks-view, [data-slate-editor]) .block.has--backgroundColor--dark :where(*)`.
   It **names the editor too**, so the canvas flattens identically — on this
   slot the two surfaces agree rather than diverging, which is worth knowing
   before anyone "fixes" a colour that looks wrong in the canvas.
2. The README said the button "inverts to light-on-dark ... an accident of the
   system colours". **Wrong about the mechanism**: a background is not a colour,
   so `--promo-cta-bg` passes through while `--promo-cta-fg` is flattened with
   everything else and is *inert on that slot whatever a theme sets*. Unthemed
   on derico the result is a black `CanvasText` slab on a dark teal band wearing
   the band's light ink — legible, and a shape nobody chose. The seam can take
   the fill back and cannot take the ink back. This stays documentation rather
   than a test: jsdom computes no cascade, and the rule lives in a Blicca
   stylesheet this repo does not build.

### Judged against the real band

Side by side with the chrome pagelet the anatomy matches element for element and
the dress does not: the real band is a **light** ground with a copper button and
a much larger heading. Every gap is a property — `--promo-title-size`,
`--promo-cta-bg`, and a light background slot instead of `dark` — and setting
three of them live turned the promo into a derico band. **Nothing needed an
option the block lacks**, which is the whole claim a reference case is allowed
to make. The band itself stays a chrome pagelet; nothing in `plonetheme.derico`
was touched.

One honest difference between the surfaces, found here rather than assumed:
**the title is weight 600 on the published page and 400 in the canvas**, because
Barceloneta styles `h2` and Plate's preflight flattens it. Ticket 11 flagged
this as a cross-*host* guess; it is in fact visible **within one host**. It is
the price of not scope-locking the weight (ticket 04), so it is now stated in
the README's "Not themeable, on purpose" rather than fixed.

### Handed on

- **[Ticket 14](14-verify-reference-case-image-left.md)**: the host's image
  widget renders in the Blicca sidebar **with no label at all** — the schema's
  `image: {title: "Image"}` is dropped, so the author sees an unlabelled text
  input as the fourth field in *Default*. Invisible to case A (no picture);
  case B is where it bites.
- **[Ticket 16](16-derico-token-line.md)**: the token list this case actually
  demands, and the fact that on the `dark` slot only the button's *fill* is
  reachable.
- **[Ticket 15](15-verify-native-aurora.md)**: reference case A cannot have its
  ground in Aurora proper — `backgroundField()` returns null there — so the
  native rendering of this case is an unbanded promo, now asserted in the schema
  suite.


## Notes from [ticket 11](11-build-the-stylesheet.md) (2026-09-03)

The sheet is built and its defaults are verified on `/Plone` with every
`--promo-*` unset. Three things this case is now the first to reach:

1. **The `dark` slot flattening is still unexercised.** Ticket 11 could not
   reach it — it needs a real block carrying `has--backgroundColor--dark`, which
   is this case's band. The arithmetic is confirmed from source
   (`blocks_view.css:488` is (0,3,0) against our (0,2,0)) and both interactions
   are documented in the README; this ticket is where the documentation gets
   tested. Watch the kicker and the `link` variant go monochrome, and watch the
   `CanvasText`/`Canvas` button invert to light-on-dark — correct, but arriving
   from the system colours rather than from intent.
2. **`--promo-measure` is a CAP, not a width.** At `center` the copy box is
   `fit-content` (auto margins absorb the free space) and only caps at 60ch. A
   short line therefore sits in a narrow, centred box rather than a 60ch one.
   That matches the README wording and is better typography, but judge case A
   knowing it is deliberate.
3. **`--promo-padding` defaults to `0`** so a banded promo is not double-padded:
   the band's own `--aurora-space-block` is the padding. If the band looks tight
   here, the fix is the property, not the default.
