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

**One thing ticket 06 left for this ticket to decide.** The runner is standing
and `@plone/registry` / `@plone/helpers` are the real published packages at the
host's versions — but the five installers above are **not** installed. Ticket 06
instead transcribed `@plone/cmsui`'s registration *list* into
`test/upstream-registry.ts`, with **named placeholder components**. Installing
the real installers means pulling the Aurora app stack (`@plone/cmsui` alpha.4
drags in `@plone/components`, quanta, emoji-mart, babel) into a block add-on's
devDependencies. Decide which buys more: the transcription catches every
*resolution* difference (which key resolves, and to nothing where Blicca-only),
which is what this ticket calls "the registry differences are the risk"; the
real installers additionally pin identity — that `align` resolves to cmsui's
actual `AlignWidget` object, not merely to something registered under `align`.
Both roads are open: ticket 06's assertions are phrased by key, so swapping
placeholders for real components does not rewrite them.

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


## Notes from [ticket 11](11-build-the-stylesheet.md) (2026-09-03)

Two things to carry into the Aurora harness:

1. **Nothing dresses the block there.** The sheet is `@scope`-wrapped to
   `.aurora-editor`, `.aurora-editor-portal` and `.aurora-blocks-view`, roots
   that exist in Blicca and nowhere in Aurora proper — the delivery gap ticket
   17 flagged. `bundle-src/test/sheet-selectors.test.tsx` is the part of it a
   headless suite can hold: it asserts every selector in the sheet matches
   markup one of the two renderers actually emits, against the unsubstituted
   upstream registry. That is reachability, not appearance.
2. **The title is body-weight in Aurora and 600 under Barceloneta.** Ticket 04
   states type SIZE only (`--promo-*-size`), so weight and leading come from the
   host, and Aurora's Tailwind preflight resets headings to `inherit`. The two
   surfaces agree within each host — which is what parity claims — but the two
   HOSTS differ, and 1.75rem at body weight is the whole of the title's
   distinction there. If that reads as broken, the answer is a twentieth
   property, not a rule: ticket 04's growth policy allows it as a minor
   addition because the axis already exists in the markup.
   The editor's `.promo-incomplete` / `.promo-notice` chrome is undressed there
   for the same root reason, which is survivable only because it is prose.
