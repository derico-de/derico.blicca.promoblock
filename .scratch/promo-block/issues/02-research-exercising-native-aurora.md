# Research: how do we exercise the block in native Aurora?

Type: research
Status: resolved
Blocked by: —

## Question

Native-Aurora support is a stated must-have, and **there is no Aurora checkout
in this environment** — only the source-published `@plone/*` packages under
`plone.blicca.auroraeditor/wrapper/node_modules/`. A must-have we cannot
exercise is a claim, not a feature. Establish what verification is actually
available before ticket 08 builds against the assumption.

- **Is there a runnable Aurora?** Determine whether Aurora can be checked out
  and run against this Plone backend at all (`plone.blicca.auroraeditor`'s ADR
  0003 describes how the wrapper obtains Aurora's packages; the same route may
  or may not yield a running app). If it can, that is the verification path and
  ticket 15 uses it.
- **If it cannot**, what is the strongest available substitute? Candidates, in
  descending honesty: mounting our `edit`/`view` components in a vitest/jsdom
  harness against the **unsubstituted** upstream `@plone/cmsui` widget registry
  (this catches the whole class of "the widget only exists in Blicca" bugs,
  which is the actual risk); a Storybook-style render; or nothing but code
  review.
- **What exactly differs between the hosts?** Enumerate it, so the substitute
  test can target it: the widget registry contents, `config.getWidget`
  resolution, the presence of `BliccaChoicesWidget`, the image widget
  substitution, and the link-kit replacement. This list is the test plan.
- **Decide and record the claim we are entitled to make.** If we can only test
  the registry-level differences, the README says the block *is built against
  upstream-registered widgets and its own*, not that it *is verified in Aurora*.
  Overclaiming here is worse than the gap.

## Answer

**Verdict: do not stand up a live Aurora. Verify against the *unsubstituted
upstream registry* in a vitest/jsdom harness — candidate #2 in this ticket — and
make the correspondingly narrower claim.** The risk this actually retires is
"the widget only exists in Blicca", and that risk is fully reachable this way.

### 1. Is there a runnable Aurora? Yes in principle, and it is still the wrong call.

Established, not assumed:

- Aurora is `plone/volto`, branch **`7-plate`**, app **`apps/seven`** (the
  default branch has no `cmsui`/`blocks`/`layout` — those alphas are published
  off `7-plate`). Every `@plone/*` package here carries
  `repository: plone/volto`.
- **The network is open in this environment** — `npm view @plone/cmsui` and
  `git ls-remote https://github.com/plone/volto` both succeed. So "we cannot get
  Aurora" is false and should stop being repeated.

What makes it the wrong call is not availability, it is **three compounding
environment problems, none of which is a promo-block question**:

1. **Seven assumes domain-root serving.** Blicca's own `ImageWidget` docstring
   records why: `ImageBlockEdit` flattens URLs against
   `config.settings.apiPath`, "built for Seven's domain-root serving, which
   strips the `/<site>` prefix and 404s every scale on a Classic backend
   without virtual hosting." Running Seven against our Plone at `:8081` means
   standing up VHM rewriting first.
2. **Our block has no runtime load path into Seven.** Contract §4 — the import
   map, the `blockAddons` mount option, the wrapper's import+install
   sequencing — is *entirely a Blicca `@@aurora-edit` mechanism*. Aurora proper
   has no runtime add-on loader (§10 lists "Aurora upstream drift —
   reconciliation if Aurora grows its own runtime add-on story" as still open).
   Getting the promo into Seven means adding our package to the **monorepo's**
   deps and registry config and rebuilding the app.
3. It is a multi-day environment project sitting off this map's critical path,
   and it would gate tickets 08–15 behind work that teaches us nothing about the
   promo.

### 2. Correction to the destination's wording: there is no single "same bundle"

Worth fixing now, because it changes what ticket 15 can honestly assert. The two
hosts consume **two different artifacts built from one source**:

| host | artifact | entry |
|---|---|---|
| Blicca | the scope-wrapped Plone static bundle, runtime-imported per contract §4 | `install(config)` via `blockAddons` |
| Aurora | the **npm package**, a source dependency (`collective.fragmentsblock`'s `bundle-src` exports `./src/index.tsx`) | `install(config)` from Seven's registry config |

The **shared, load-bearing surface is `install(config)` plus the `edit` and
`view` components** — identical in both. That is precisely what a jsdom harness
can mount. So the substitute is not a watered-down version of the real test; it
targets the actual shared seam.

### 3. What exactly differs between the hosts — this is the test plan

Read off `cmsui/config/widgets.ts` (upstream) versus
`wrapper/src/bootstrap/config.ts` (Blicca, which installs cmsui first and then
overrides). **Blicca is upstream + these deltas:**

| key (category) | upstream | Blicca | touches the promo? |
|---|---|---|---|
| `choices` | **not registered at all** | `BliccaChoicesWidget` | **YES — the one that bites** |
| `image` (widget) | `cmsui ImageWidget` | `BliccaImageWidget` | **YES** — see ticket 01 |
| `object_browser` (widget) | React modal, **no upload** | pat-contentbrowser island, upload | no — promo uses free-text links |
| `boolean` (widget) | Quanta `Checkbox` | `BliccaBooleanWidget` (label adapter) | only if we add a boolean field |
| `querystring` (widget) | upstream | Blicca | no |
| `'Relation List'` (factory), `Catalog` (vocabulary) | `ObjectBrowserWidget` | Blicca's | no |
| `styleFieldDefinition` utility | **`blockWidth` only** (`@plone/blocks/index.ts:147`) | `blockWidth` + **`backgroundColor`** | **YES** |
| link-kit | cmsui's | `BliccaLinkKit` (Plate plugin) | **no** — promo has no rich text |
| `BlockSettingsForm` / renderer | upstream | **imports upstream verbatim** (`plone-block-sidebar.tsx:14`) | no difference to test |
| `align`, `size`, `width`, `date`, `datetime` | upstream | **not overridden** | safe in both |

**The three findings that matter:**

1. **`choices` is Blicca-only.** `getWidgetByChoices` returns
   `config.widgets?.choices ?? null`; upstream registers nothing, so **any field
   declared with `choices` silently degrades to a single-line text input in
   native Aurora.** This vindicates the map's decision to ship `promo_select`
   under our own namespaced key rather than lean on `choices` — a
   `widget: 'promo_select'` field resolves through `getWidgetByName` in *both*
   hosts. Ticket 07 is load-bearing for Aurora support, not a nicety.
2. **`backgroundColor`'s style definition is Blicca-only**, so the palette field
   cannot function in native Aurora regardless of how we declare it. This is
   consistent with the map's "Not yet specified" note and settles it in the same
   direction: the field is a Blicca-host affordance, and the block must render
   correctly with no `backgroundColor` at all.
3. **`textarea` is registered in neither host** — confirming the map. Aurora's
   own teaser `description` (`widget: 'textarea'`) is *already* degraded to a
   one-line input upstream. `promo_textarea` is therefore an improvement on
   upstream behaviour in both hosts, not a workaround for Blicca.

### 4. The harness is idiomatic here, not invented

- `collective.fragmentsblock`'s `bundle-src` — the map's designated copy-me
  template — **already ships `"test": "vitest run"`**. Ticket 06 inherits the
  runner for free; no new tooling decision.
- Upstream `@plone/cmsui` tests itself the same way: `vitest`,
  `@testing-library/react`, `vitest-axe`, a `vitest.config.ts` and
  `setupTesting.ts`, with real widget tests (`ImageWidget.test.tsx`). Mounting
  these source-published packages in jsdom is a **proven** pattern in this exact
  package set, not a hope.
- Note the wrapper itself has **no test runner** (`wrapper/package.json` has only
  `build`/`watch`/`typecheck`), so the harness belongs in our package's
  `bundle-src`, not in the wrapper.

**Shape of the harness (for ticket 15):** in `bundle-src`, build a config the
way *Aurora* does — `installTheming`, `installPlate`, `installBlocks`,
`installLayout`, `installCmsui`, and **stop there, applying none of Blicca's
overrides** — then call our `install(config)` and render `edit` and `view`.
Assert: every field in our `blockSchema` resolves to a real widget (nothing
falls through to the default TextField that should not), `promo_textarea` and
`promo_select` resolve, the `image` field resolves to cmsui's `ImageWidget`, and
`view` renders the same anatomy classes as under the Blicca config.

### 5. The claim we are entitled to make — record this verbatim in the README

> The Promo block is built against upstream-registered Aurora widgets and its
> own namespaced widgets, and its `install`, `edit` and `view` are exercised in
> a jsdom harness against an **unsubstituted upstream `@plone/*` registry**. It
> has **not** been run inside a live Aurora (Seven) application.

**Do not** write "verified in Aurora". The residual, honestly-stated gap:

- No live Seven run — so app-level integration (routing, loaders,
  `config.settings.apiPath` flattening, real upload against `@createContent`)
  is unexercised.
- The **npm-package artifact** is not built and consumed by a real Aurora build;
  only the shared source is exercised.
- A cross-host value-space divergence found in ticket 01 stands unfixed and
  unfixable from our side: a promo authored in Blicca stores
  `../resolveuid/<UID>`, which Seven's `getPreviewSrc` would render as a raw
  `src` because it does not start with `/`. Editing preview only, not published
  output — but ticket 15 must expect it rather than read it as a failure.

### 6. Consequences for the map

- **Ticket 15 is re-aimed** from "run it in Aurora" to the harness above; its
  body has been updated and its `Blocked by` dropped from `02, 08` to `08`
  (this ticket is now resolved, and nothing about the harness needs a live
  Aurora).
- **Standing up a live Seven against this backend is ruled out of scope** for
  this map — it is an environment project, not a promo-block decision, and the
  destination asks for the native-Aurora path *exercised*, which the harness
  does. Recorded in the map's Out of scope.
- **Ticket 03 gains two hard constraints** rather than open questions: no field
  may rely on `choices` for its widget, and the block must render correctly with
  `backgroundColor` absent.
