# Build: the server half — `@@aurora-block-promo`

Type: build
Status: resolved
Blocked by: 03, 17

## Question

The Blicca public renderer, which must emit **byte-comparable anatomy** to
ticket 08's `view`, because one scope-wrapped stylesheet dresses both surfaces.

- **Registration**: `browser:page name="aurora-block-promo" for="*"`, permission
  `zope2.View`, on the add-on's own browser layer. Dispatch is by view name
  only — `BlockDispatchMixin.render_block_data` resolves
  `getMultiAdapter(..., name=f"aurora-block-{block_type}")`; the record's
  `types` field never influences it.
- **Subclass `BaseBlockView`** from the promised path
  `plone.blicca.auroraeditor.rendering`. `self.data` (post-transformer) and
  `self.block_type` are stamped before `__call__`.
- **A Chameleon template**, not a string, given the branching. Commentary must
  be `<!--! … -->`: Chameleon refuses an ASCII `--` inside an HTML comment, and
  an ordinary comment ships to every visitor.
- **Screen the links.** This block offers free-text links, so `path_of()`'s
  documented limit is a live case here, not a latent one: it reports
  `urlparse(url).path`, which is truthy for `mailto:` and `tel:` and returns
  them **with the scheme stripped**. Decide the rule — pass non-http(s) schemes
  through whole — implement it here, and pin it with a test using the reference
  case's `mailto:` action.

  **Ticket 01 widened this: the image field is a second free-text surface.** In
  native Aurora the host `ImageWidget` offers a plain URL input, so `image` can
  hold an arbitrary external URL — the screening rule must cover it, not just
  the CTA hrefs. The stored value is always a bare string or absent, but its
  form varies by host: `../resolveuid/<UID>` (relative, Blicca), an absolute
  `@id`, or an external URL. Read tolerantly, and never assume a leading `/`.
- **Images through `image_source()`**, which returns `None` to mean *do not
  build a `<picture>`* (no scales, no base, or an SVG) — render a plain `<img>`
  then. `picture_tag` is deliberately **not** promised; if art direction or an
  eager LCP image is ever wanted, call `plone.namedfile`'s `Img2PictureTag`
  directly, which is the sanctioned path rather than a workaround.
- **Error policy is inherited**: `render_block_data` wraps each block, logging
  and emitting `block-render-error` in production, propagating in dev mode.
  Don't re-implement it; don't swallow exceptions locally.
- Tests: pytest over every state from 03, plus an explicit test asserting the
  emitted class list equals the React view's.

**Note from [ticket 07](07-build-the-two-widgets.md):** a link picked through
`promo_link` is stored as **`../resolveuid/<UID>`** in both hosts (see
`bundle-src/src/widgets/LinkWidget.tsx`'s `storedLinkFor()` for why the brain's
`@id` was rejected). So the three link fields can each hold a relative
resolveuid path alongside a typed `/path`, `mailto:` or `https:` — it passes
Q7's allowlist as a site-relative path, and this renderer decides whether to
resolve it to a real URL or emit it for the public `for="*"` resolveuid view to
follow.

### Note from [ticket 12](12-build-registration.md)

The block add-on record is installed on the sandbox site, so the wrapper's
soft-lockstep warning now fires on **every** `@@aurora-edit` render:

> `Aurora block add-on 'derico.blicca.promoblock.promo' registers editor block
> 'promo' but no aurora-block-promo renderer view is registered; public pages
> will render it as block-unrendered.`

It is the cheapest server-side check that this ticket has landed: the line
disappears the moment the view is registered under the package's own browser
layer. Scaffold the view with `plonecli add view` (map Notes).

## Answer

**Built and green: 95 renderer tests + 63 `promo_data` tests (200 in the
package), with vitest's 158 still passing — both suites now read the same 23
cases of `tests/anatomy-cases.json`, which is the whole of what ticket 17 was
for.** Files: `views/promo_block_view.py` + `.pt` (scaffolded with `plonecli add
view`, renamed off `my_view`), `promo_data.py`, and two suites.

Three decisions the ticket left open, and one correction to itself.

**1. Link resolution improves the href; it never decides the anatomy.** The
ticket asked whether to resolve `../resolveuid/<UID>` or emit it for the public
`for="*"` view to follow. Emit was rejected: the stored form is *document*-
relative, so it resolves against the published page's own URL and lands
somewhere different at every depth — and above the site root it leaves Plone
entirely. `resolve_link()` therefore runs `resolve_uid` and `path_of`. But a
reference whose target is **gone** comes back unchanged and the action still
renders, **deliberately unlike ticket 10's rule for a dangling image**. The
asymmetry is the point: a missing picture changes the *layout*, so the two
renderers must agree about it, whereas a dead link changes nothing but where the
click goes — and the canvas renders that action too, so making resolution
anatomy-bearing here would have invented a divergence rather than closed one.
Screening decides what renders; resolution decides where it points. Scheme
safety then falls out **structurally** rather than by a guard: `RESOLVEUID_RE`
cannot match a `mailto:` or `tel:` value, so those return unchanged and never
reach `path_of` at all. Pinned both ways — `path_of("mailto:md@derico.de") ==
"md@derico.de"` is asserted as the trap, beside the renderer emitting the
reference case's action whole.

**2. `image_url` is the single source *and* the single gate.** The renderer
never guesses from the raw `image` the way the canvas must; ticket 10 has
already run. Screening that one key with `IMAGE_SCHEMES` is what covers the
image field's own free-text surface, because ticket 10 emits an external URL
**whole** — so `javascript:` typed into Aurora's plain-URL image input arrives
as `image_url` verbatim and is stopped here, not by the transformer.

**3. `image_source()` returning `None` no longer means "emit no `<picture>`".**
This ticket said render a plain `<img>` instead; **ticket 17 landed afterwards**
and made `<picture>` + `<img>` unconditional on both surfaces precisely so this
branch is invisible to the sheet. `None` now means "no scale-derived ladder",
and the screened `image_url` carries that case. What the promised surface adds
over the canvas's single `src` is the intrinsic `width`/`height`, which is what
stops the picture reflowing the page as it loads. **No `srcset`**: ticket 08's
reason holds identically on the server — `w` descriptors without a `sizes`
policy default to `100vw` and over-fetch, and `sizes` depends on `blockWidth`
and the theme's layout, neither of which a generic block can know. `picture_tag`
stays unused as instructed; `Img2PictureTag` with an `image_source()` `src`
remains the sanctioned path if art direction is ever wanted.

**The whitespace rule is sound, not approximate.** The template is authored
readably and `__call__` collapses `>\s+<`, rather than hanging the brackets
inside the start tags. That is safe on two invariants this code holds rather
than hopes for: every text value goes through `promo_data.text`, so no text node
begins or ends with whitespace, and Chameleon escapes every value, so the only
bare `<`/`>` in the output are structural. Three tests pin it — no
inter-element whitespace anywhere, a title's *internal* double space surviving,
and `<script>` arriving escaped.

**The Chameleon `--` trap is wider than this ticket recorded.** It refuses a
double hyphen **anywhere inside a comment body, prose included** — not merely
the `--` of an HTML comment terminator. So `has--align--` and `promo-cta` class
names with doubled hyphens cannot be *named* in template commentary at all. One
compile failure, then reworded.

**`promo_data.py` is the Python twin of `promo/data.ts`, and is Plone-free on
purpose** — the pure table stays cheap to test and the rendering concerns
(resolving a reference, building a base image) stay in the view where the
context lives. `TestScreenParity` reads `LINK_SCHEMES`/`IMAGE_SCHEMES` and the
Q5 fallbacks straight out of the TS file (Python-reads-TS, ticket 08's
direction) and rules out the classic silent pass first: it asserts the file is
where it thinks and that the parser found a non-empty list, so a moved or
reformatted `data.ts` fails loudly instead of comparing against nothing.

**The fixture is matched exactly, not only as a skeleton.** 22 of the 23 cases
are byte-identical up to attribute order; only `image-with-scales` is exempt,
because `image_source()` builds the original-size download while the fixture's
`src` is the editor's preview scale. The exemption list is a **denylist**, so a
case added later falls into the strict comparison and someone has to
consciously waive it. One extra normalization beyond the vitest suite's:
Chameleon writes void elements XHTML-style (`<img … />`) and React
HTML-style — the same element in two serializers' spellings, exactly like the
attribute order, and a no-op against the fixture.

**No GenericSetup profile XML changed**, so no upgrade step: a `browser:page` is
ZCML, and the map's standing rule is about profiles. `pyproject.toml`'s plonecli
bookkeeping records the real registered name, `views = ["aurora-block-promo"]`,
matching `collective.fragmentsblock`.

**Ticket 12's soft-lockstep note is closed in-process, not by reading a log
line.** `test_it_closes_the_wrappers_soft_lockstep_gap` calls `lockstep_gaps`
directly and asserts no gap for `promo` — and since that function only walks
add-ons which survived every gate, an empty result is also proof the record is
still loadable. **Not verified live: Plone is not running in this sandbox**, so
the warning's disappearance from the instance log is unobserved; live rendering
belongs to tickets 13/14 anyway.

Every guard was mutation-checked (twelve mutations, each failing the tests that
claim it, with a no-op control confirming the harness reports "no failure" when
nothing changes): dropping the whitespace collapse, widening `LINK_SCHEMES` to
`javascript`/`data`, making `resolve_link` the identity, dropping
`effective_align`'s image guard, removing the `image_source()` branch, dropping
`actions` from `has_copy`, renaming `promo-kicker`, turning the card link into a
root tag swap, keying the click rule on the rendered action instead of the
label, diverging the Python table from the TS one, dropping `alt=""`, and
removing the variant fallback.

**Carry to ticket 11:** the server's `<img>` carries `width`/`height` when the
image resolved to in-site scales and **omits them otherwise**, and the canvas's
never carries them at all. So the sheet must size `.promo-image` itself and must
not lean on intrinsic attributes for aspect ratio, or the two surfaces will
differ on exactly the images that have scales. This joins ticket 08's rule that
the sheet must never select on `[href]`.


## Note from [ticket 08](08-build-editor-half.md) (2026-09-03)

The React half is built, so this ticket now has a fixed target rather than a
peer to agree with. Six things it hands over:

1. **`../../../tests/anatomy-cases.json`** (the package root's `tests/`) — 23
   hand-authored cases, each a stored node plus the exact markup, written from
   ticket 17's class table and ticket 03's Q8 table, and already asserted
   against the React renderer. **Read it from this suite too.** The
   cross-renderer contract is the file's **skeleton** — the markup with every
   attribute but `class` removed, text kept — which is precisely what lets this
   renderer emit a real resolution ladder in its `<img>` while being held to
   the same anatomy. `bundle-src/test/promo-anatomy.test.tsx` has the
   normalization; reimplement the same rule in Python. One case,
   `image-dangling-reference`, carries a `reactOnly` override and its reason:
   **this renderer takes the plain `html`** (no `image_url` ⇒ no-image layout,
   per ticket 10).
2. **Q8 rows 2, 3 and 8 are one rule.** A link that fails the Q7 screen is
   treated exactly as an absent link — the action renders nothing and the
   card-link wrapper is not emitted. Row 8's "as text, no `href`" was **not**
   implemented: it would emit a `.promo-cta` that ticket 17's table says cannot
   exist, and would restore the dead button row 2 exists to remove. The canvas
   names the failure instead. Spell it the same way here.
3. **The click rule is keyed on the LABEL, not on whether an action renders.**
   A label with no link therefore suppresses the card link *and* renders no
   action, so the promo is not clickable at all. Fixture case
   `card-link-orphaned-by-a-label-that-renders-nothing` pins it.
4. **The Q7 parity test is yours, and the direction is Python-reads-TS.**
   `LINK_SCHEMES` and `IMAGE_SCHEMES` are exported from
   `bundle-src/src/promo/data.ts`; `TestScreenParity` should read them out of
   that file and compare with its own tables, because Python arrives second and
   reading TS from Python is the cheaper direction. `bundle-src/test/promo-screen.test.ts`
   owns the *behaviour* of the JS spelling; the lockstep assertion is here.
5. **The Q5 fallbacks are in `promo/data.ts`** and must be spelled again here:
   variant absent ⇒ `button` (an off-list variant too), `align` ⇒ the
   *effective* placement, `blockWidth` ⇒ `default`. Emit `has--align--<value>`
   **always**.
6. **`alt=""`.** Ticket 03 declared no `alt` field, so the picture is marked
   decorative on both surfaces; an `alt` invented from `title` would be read
   twice. Match it.

Not your problem, recorded so it is not rediscovered: the editor surface is the
same markup with every `href` dropped (ticket 08's canvas-safety rule). This
renderer always emits them.
