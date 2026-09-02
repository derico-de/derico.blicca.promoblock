# Build: the server half — `@@aurora-block-promo`

Type: build
Status: open
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

## Answer

<!-- fill in -->
