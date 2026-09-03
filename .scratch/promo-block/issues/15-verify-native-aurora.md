# Verify: the block works in Aurora proper

Type: verify
Status: resolved
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

**Resolved.** The block is exercised against the registry Aurora actually
builds, the decision this ticket carried went to the **real installers**, and
the reason was not fidelity in general but a circularity that made the old
fixture unable to fail. 60 new tests in
`bundle-src/test/aurora-harness.test.tsx`; the suite is 183 → **243**, Python
235 still green, typecheck clean, and the built artifact is byte-identical
(18.71 kB) because nothing shipped changed.

### The decision, and the argument that settled it

Ticket 06 left the choice between its hand-transcription of `@plone/cmsui`'s
registration list and installing the five real installers. Both roads bought
"which key resolves"; the real one additionally pins identity. That framing
undersold it.

**The assertions this fixture exists to support are mostly assertions of
ABSENCE** — no `choices`, no `textarea`, no `select`, no `backgroundColor`
style field. Against a transcription each of those passes *because we chose
not to transcribe them*. They restate the fixture's own construction and
cannot fail while the hypothesis they describe is false. Ticket 02 named
exactly this as the risk the block carries, so the fixture that was supposed
to verify it was the one thing structurally incapable of doing so. Against the
packages Aurora ships, the same line is an observation about upstream.

A transcription is also a copy needing manual resync: were cmsui to rename or
drop a widget, the copy keeps passing. It is now checked every run.

Cost, measured rather than feared: **154 → ~670 packages, devDependencies
only**, install ~11s, suite 8s → 16s. They publish raw TypeScript
(`"main": "index.ts"`), so vitest transforms them directly with no build step
and no CSS/asset loader trouble — the whole five-installer bootstrap runs in
under a second under jsdom. The shipped bundle is unaffected and now says so
under test: it imports four modules, all promised externals, and none of the
app stack.

For the record, the transcription was **exact** — twelve registrations, same
keys, same order, same default widget. It was not wrong; it was unfalsifiable.

### The finding: every `choices` absence assertion in the suite was vacuous

Caught by mutation, not by reading. Registering Blicca's choices widget into
the fixture left **all four** "no `choices` widget" tests green.

`config.getWidget(key)` walks the widget categories and looks `key` up inside
each, guarded by `typeof group === 'object'`. Blicca registers
`registerWidget({ key: 'choices', definition: BliccaChoicesWidget })` — a bare
component, not a `{ name: Component }` map — and `registerWidget` stores a
non-map definition **as the category**: `widgets.choices = Component`. A
function fails the `typeof === 'object'` guard, so `getWidget('choices')`
skips it and returns `undefined` **whether or not it is registered**.
`Field.tsx` knows this and reads `config.widgets?.choices` directly
(`getWidgetByChoices`).

So the flagship claim of ticket 02's risk was asserted through a path that
could never observe it. Fixed at all four sites via a documented
`choicesWidgetOf()` helper; re-mutating now fails all four. This was latent
since ticket 06 and would have survived any amount of re-reading — only the
real installers made a mutation available to try.

### The boundary this suite found, and could not have found before

Two of the four upstream widgets the schema resolves to **cannot be mounted**
outside Aurora's edit data-route:

- `ObjectBrowserWidget` → `useLoaderData`. ADR 0009 already recorded this as
  Blicca's reason for substituting it.
- `ImageWidget` → `useFetcher`. **New.** Nothing recorded this before; the
  image field is the promo's other deliberate host-widget exception, so it
  matters as much as the picker.

`AlignWidget` and the default `TextField` are pure Quanta and do mount, so two
of the four resolutions are exercised rather than merely asserted. All three
facts are pinned as tests, so the boundary is under CI rather than remembered;
if upstream drops the route dependency they fail and the README claim can be
widened.

Consequence inside the suite: `widgets.test.tsx`'s two picker tests now supply
a stand-in, because the placeholder they used to mount was the only reason
mounting the "host picker" ever worked. That is the divergence the
placeholders were hiding, and it is a harness limitation, **not** a promo
defect — in Aurora the picker mounts inside the edit route, where Aurora's own
teaser picks its target the same way.

### The two specifics ticket 02 asked this harness to cover

Both turned out **closed by design**, not merely expected — and are now pinned
so a refactor cannot quietly reopen either:

1. **`choices` degrading to a text input.** Closed by ticket 03: the two
   fields declaring `choices` carry `widget: 'promo_select'`, and
   `getWidgetByName` short-circuits to the DEFAULT once `widget` is a string —
   it never reaches `getWidgetByChoices`. Asserted field by field.
2. **`../resolveuid/<UID>` reaching the DOM as a raw `src`.** This ticket
   expected to tolerate it. Closed by ticket 08 instead: the block never calls
   `getPreviewSrc`, resolving previews with its own ladder, and a resolveuid
   reference takes branch 2 in either host. Held by an assertion that
   `getPreviewSrc` appears in neither `data.ts` nor the built artifact —
   `@plone/helpers` is a promised external, so an import back to it would cost
   nothing at build time and be easy to miss in review.

### What else the real installers made assertable

- **The promo joins Aurora rather than displacing it.** `installBlocks`
  registers `image`, `teaser`, `video`, `listing`; the transcription
  registered no blocks at all, so the reason the block is `promo` and not
  `teaser` could not be tested against Aurora until now. Also: it adds exactly
  one entry, and does not touch Plate's block table.
- **The layer stack**, `theme … cmsui`, which is the observable end of the
  host's install order.
- **`view` reads nothing from the registry.** Stripping every widget and block
  registration leaves the markup byte-identical — the strongest available form
  of "renders standalone", and the reason the two hosts cannot diverge here
  even in principle. In Aurora `view` *is* the public rendering.
- **The artifact is importable as plain ESM** and its default export installs
  — the only test that executes what `plone:static` publishes. It is copied
  inside the workspace first, because the four bare specifiers are resolved in
  the browser by the `@@aurora-edit` import map and resolve to nothing at all
  from `static/`.

### Two incidental corrections

- `@plone/registry`'s config object is **frozen**. An idempotence marker
  property throws; the guard uses a `WeakSet`. Nothing can bolt state onto the
  host's registry at runtime.
- The bundle-hygiene regex read `from "…"` only and so ignored bare
  side-effect imports (`import "react-router";`) — found by mutating the
  artifact. Both forms are matched now.

### The cost that did land somewhere visible

`pnpm typecheck` broke: `tsc` follows the imports into the installers' raw
`.ts` source, which does not compile standalone (~40 errors, every one in a
file we do not own — `@plone/aurora/app/root`, `*.module.css`, `./Logo.svg`,
missing `@plone/types`). `skipLibCheck` does not help; it skips `.d.ts`, and
these are sources. Resolved by mapping the eight specifiers to
`test/aurora-packages.d.ts` through `tsconfig`'s `paths`, which redirects
**type** resolution only — vitest still loads the real packages, which is the
entire point. Documented in that file, with the condition for deleting it
(Aurora shipping built types).

### The claim, as the README now states it

> The block is **built against upstream-registered widgets and its own**, and
> every field it declares resolves in Aurora to the widget it was designed
> for.

Deliberately narrower than "verified in Aurora". The README's new section
lists what is not covered: no Seven app is stood up (out of scope, ticket 02);
the two route-bound widgets; nothing dresses the block there, because the
sheet is `@scope`-wrapped to roots that exist only in Blicca; and the title is
body weight in Aurora. Ticket 11's two notes are absorbed there rather than
left on this ticket.

### Not done here, deliberately

**No twentieth property for the title's weight.** Ticket 11 flagged that
1.75rem at body weight is the whole of the title's distinction in Aurora and
that the fix would be `--promo-title-weight`, which ticket 04's growth policy
allows as a minor addition. It stays flagged: this ticket cannot *see* Aurora
render, so it has no standing to judge whether that reads as broken. It is
recorded on the map as fog, for whoever first looks at a real Aurora page.


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
