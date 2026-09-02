# Build: `promo_textarea`, `promo_select` and `promo_link`

Type: build
Status: open
Blocked by: 03

## Question

The block ships its own widgets because the ecosystem has none: `textarea`,
`select`, `color_picker` are declared in the type union with **zero
implementations**, and `choices` is registered only by the Blicca wrapper. With
editing sidebar-only, these are the difference between a usable block and
single-line inputs everywhere.

- **Namespaced keys only** — `promo_textarea`, `promo_select` — registered from
  our `install()` via `registerWidget({ key: 'widget', definition: {…} })`.
  `registerWidget` is a global last-wins map; claiming `textarea` would change
  every other block's fields, including Aurora's own teaser description. That
  fix belongs upstream.
- **Match the props contract** the sidebar passes. `BlockSettingsFormRenderer`
  spreads the *entire* schema property onto the widget, so arbitrary keys
  (`description`, `default`, `choices`, `widgetOptions`) arrive as props; read
  `@plone/cmsui/components/Form/Field.tsx` for what is guaranteed and copy
  `derico-hero`'s `TextareaWidget` for the shape that is known to work.
- **`promo_select`** renders `choices: Array<[value, label]>`. Blicca's
  `BliccaChoicesWidget` is the reference implementation — but we register our
  own so the block does not depend on the wrapper existing.
- **`promo_link`** (added by ticket 03, Q1/Q10) is a **composite** over a bare
  string: a text input for the stored value, plus a browse button that renders
  **the host's own registered picker**, looked up as
  `config.getWidget('object_browser')` — never imported. A block cannot import
  either implementation: Blicca's is `pat-contentbrowser` behind `PatternHost`,
  absent from an npm-installed Aurora, and upstream's calls `useLoaderData` from
  the edit route (ADR 0009: it "would crash under the one-route MemoryRouter").
  The lookup gives each host the one that works in it; upstream's own teaser
  picks its target from the block sidebar exactly this way.
  - It exists because **neither host implements `allowExternals`** — both
    schemas declare it and both widgets drop it — so `object_browser` alone
    cannot express the `mailto:` the first reference case needs.
  - On selection, write the picked brain's `@id` into the string. The value
    **stays a bare string** in both hosts, so the field degrades to a plain text
    input if this widget is dropped, and needs no migration if it is added later.
  - Accept that the stored path differs by host — Blicca a relative
    `../resolveuid/<UID>`, upstream an absolute `@id` — the same divergence the
    `image` field already has (ticket 01).
  - Free text must remain typeable: the browse button is an affordance, never a
    gate. `mailto:`, `tel:` and site-relative paths are typed, not picked, and
    are screened by ticket 03's Q7 allowlist at render, not here.
- **Both must work with no Blicca present** (ticket 02's harness). That is the
  entire reason they exist.
- **Accessibility**: real `<label>` association, and the textarea must not trap
  or swallow keys that the surrounding Plate editor needs.
- Tests: mount each widget in the vitest suite against the **upstream** stub
  registry and assert value round-trip through `onChange`.

## Answer

<!-- fill in -->
