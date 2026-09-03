# Build: `promo_textarea`, `promo_select` and `promo_link`

Type: build
Status: resolved
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

**All three built, registered and covered (22 tests); one premise of this
ticket corrected.** `src/widgets/` holds `TextareaWidget.tsx`,
`SelectWidget.tsx`, `LinkWidget.tsx` and the `field-shell.tsx` they share;
`registerPromoWidgets(config)` runs from `install()` before the block entry.
`pnpm test` 35 passed, `pnpm typecheck` clean, `pnpm build` green with
`react`, `react/jsx-runtime` and `@plone/registry` still external.

### The correction: a picked item is stored as `../resolveuid/<UID>`, not the `@id`

This ticket said to write the picked brain's `@id` and to accept that the
stored path would then differ by host. Read against the hosts, writing the
`@id` is **wrong in Blicca specifically**: `aurora_edit.py` sets
`apiPath = portal.absolute_url()`, so the `@search` enrichment behind
`pat-contentbrowser` returns fully absolute ids — `http://<host>/<site>/kontakt`
— and persisting one bakes the deploy's hostname into content.

`BliccaImageWidget` already reached this conclusion for the image field and
converts the same way, for the same reason. Doing it here makes the two hosts
**converge** rather than diverge: a resolveuid URL has no `apiPath` prefix to
flatten, resolves against the rendering page through the public `for="*"`
resolveuid view, survives a move or rename, and passes Q7's allowlist as a
site-relative path. Upstream carries `UID` in `selectedItemAttrs`' default
set, so both hosts land on the same spelling. The `@id` fallback stays for a
host or vocabulary that omits `UID` — `filterBrainAttributes` keeps only the
attributes actually present. Extracted as `storedLinkFor()` so **ticket 09's
server renderer has a named thing to resolve**, and so the rule is asserted
independently of the React mount.

### Three host facts that shaped the widgets

1. **The renderer never passes `id`.** `BlockSettingsFormRenderer` passes the
   spread schema property plus `className`, `label`, `name`, `defaultValue`,
   `required`, `error`, and `Field.tsx` adds `label: title` and a defaulted
   `placeholder`. `props.id` is therefore `undefined` in the block sidebar —
   so `htmlFor={props.id}`, the shape both `BliccaChoicesWidget` and
   `BliccaObjectBrowserWidget` use, silently associates nothing. All three
   promo widgets go through `FieldShell`, which mints an id with `useId()`.
   That is this ticket's accessibility requirement, and the reference
   implementations do not meet it.

2. **The renderer never passes `value` either**, despite `FieldProps`
   declaring it required — only `defaultValue={field.state.value}`. So the
   text surfaces are **uncontrolled**, seeded from `defaultValue` (with
   `value` read first in case another host does pass it), which is also what
   upstream's default `TextField` is: react-aria, `defaultValue`-only. A
   controlled textarea would re-render from the node on every keystroke,
   since the schema function re-runs on each form change. `promo_select` is
   the exception and is controlled — a select has no caret to lose.

3. **No key guard is needed, and adding one would be wrong.** The sidebar is
   a `createPortal` into `#sidebar` from Plate's `render.afterEditable` slot,
   making it a *sibling* of the `Editable`, not a descendant: keydowns there
   never reach Plate's editable handlers by React bubbling. A blanket
   `stopPropagation` would only break the document-level listeners the editor
   legitimately keeps. Asserted by a test that fires Enter in the textarea and
   requires a document listener to see it.

### Two deliberate improvements on `BliccaChoicesWidget`

- **With nothing stored, `promo_select` shows the schema's `default`** rather
  than the first choice — and stores nothing (no `onChange` on mount). Q5
  seeds nothing at insert time and both renderers fall back to `button`
  themselves, so showing `default` is what the author will actually get.
- **A stored value outside `choices` keeps its own option.** A controlled
  select with an unmatched value renders as if nothing were selected, which
  would show `Button` over storage saying otherwise.

### `promo_link` shape

Text input (the source of truth) + a `Browse…` disclosure that mounts the
host's picker **only while open** — Blicca's is a pattern island with a
network round trip and a promo sidebar holds three link fields. `mode:
'single'`, no `label` (the shell owns it, and upstream's widget renders its
own if given one), and `widgetOptions` forwarded untouched so a schema can
constrain `selectableTypes` without this widget knowing how. No
`object_browser` registered ⇒ no Browse control at all, and the field is a
plain text input: the picker is an affordance, never a gate. An empty
selection is ignored rather than clearing the field — a deselection inside
the picker must not erase a typed `mailto:`.

**Nothing is screened here.** Q7's allowlist runs at render, twice; rejecting
mid-keystroke would make `mail` untypeable on the way to `mailto:`. A test
pins this by asserting `javascript:alert(1)` is stored as typed.

### Styling, and what ticket 11 should know

`promo-block.css` is scope-wrapped to `.aurora-editor`,
`.aurora-editor-portal` and `.aurora-blocks-view` — roots that exist in
Blicca and **nowhere in Aurora proper**, whose sidebar is its own app shell.
So the block's own sheet cannot reach these widgets, and the visual metrics
are the host's own Tailwind utilities copied from `BliccaChoicesWidget`
(itself copying cmsui's `components/Field/Field.tsx`). They style the widget
wherever cmsui's sheet is loaded and degrade to unstyled-but-usable markup
where it is not. `promo-textarea-widget` / `promo-select-widget` /
`promo-link-widget` are ours, as a hook that never depends on Tailwind being
present. **Ticket 11 owns the block, not the sidebar** — do not try to dress
these three from that sheet.

### What this hands the downstream tickets

- **08** wires `blockSchema` and can assert `PROMO_WIDGETS` covers every
  `widget: 'promo_*'` the schema names.
- **09** resolves `../resolveuid/<UID>` server-side; `storedLinkFor()` names
  the shape it will meet, for `card_link` and both `cta_*_link`.
- **15** gets three more mounts that already run against the unsubstituted
  upstream registry, including the no-`object_browser` degradation path.
