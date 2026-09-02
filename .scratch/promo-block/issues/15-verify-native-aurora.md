# Verify: the block works in Aurora proper

Type: verify
Status: open
Blocked by: 08

## Question

The stated must-have, verified to the depth ticket 02 established is available.

**Method — settled by ticket 02, not open here.** A **vitest/jsdom harness in
`bundle-src`**, building the registry the way Aurora does — `installTheming`,
`installPlate`, `installBlocks`, `installLayout`, `installCmsui`, and **none of
Blicca's overrides** — then calling our `install(config)` and rendering `edit`
and `view`. No live Aurora (Seven) is stood up; that is out of scope on the map.
`collective.fragmentsblock`'s `bundle-src` already ships `vitest run`, and
upstream `@plone/cmsui` tests its own widgets this same way, so the runner is
inherited rather than chosen.

Two specifics ticket 02 turned up that this harness must cover:

- **`choices` is registered in Blicca and nowhere upstream.** A field relying on
  it degrades to a single-line text input in Aurora. Assert no promo field does.
- A promo authored in Blicca stores `../resolveuid/<UID>`, which Seven's
  `getPreviewSrc` renders as a raw `src` (it does not start with `/`). **Expect
  this**; it is an editing-preview divergence, not a build failure.

- **The registry differences are the risk**, not the rendering: our widgets must
  resolve without the Blicca wrapper, `align` must resolve to cmsui's upstream
  `AlignWidget`, the image field must resolve to cmsui's `ImageWidget`, and no
  field may quietly fall through to the default single-line input.
- **Assert the absence of Blicca**: the harness must not have
  `BliccaChoicesWidget`, the substituted image widget, or the wrapper's link
  kit registered. A test that passes only because Blicca happened to be present
  proves nothing.
- **`view` renders standalone**, since in Aurora it *is* the public rendering.
  The server template plays no part there.
- **Bundle hygiene**: `assertNoSharedInBundle` passed, the eight promised
  modules external, and the bundle importable as a plain ESM module.
- **State the claim honestly** in the README, bounded by what was actually
  exercised. If only registry-level differences were tested, say the block is
  *built against upstream-registered widgets and its own*, not that it is
  *verified in Aurora*.

## Answer

<!-- fill in -->
