# Decide: the Promo's content model and `blockSchema`

Type: grilling
Status: resolved
Blocked by: —

## Question

Fix the block's `blockSchema` and its stored JSON shape, so the editor half
(08), the server half (09) and the transformer (10) build against one contract
without re-deciding.

Settled already: stored keys `head_title` / `title` / `description` labelled
Kicker / Title / Description; a fixed `cta_primary` / `cta_secondary` pair, each
label + link + variant; a card link; `align` as a plain data field with
`widget: 'align'` and `actions: ['left','right','center']`; `blockWidth` and
`backgroundColor` as style fields; nothing `required`; no `defaultBlockWidth`.

### Settled by research — not open here (tickets 01, 02)

- **The `image` field name is confirmed.** `getWidgetByFieldId(id ?? name)` runs
  first and unconditionally, and the key it uses is the **schema property key**.
  Both hosts register `image` — under category `widget`, but
  `config.getWidget` searches **all categories flat**, so it resolves anyway.
  Note Aurora's own image block spells this `url` + `widget: 'image'`; we are
  deliberately not matching it. Comment the choice.
- **The flat namespace is also why `promo_*` prefixes are mandatory.** There is
  one key space across `id`/`widget`/`type`/`vocabulary`/`factory`.
- **No promo field may rely on `choices` for its widget.** `choices` is
  registered in Blicca and **nowhere upstream**, so such a field silently
  degrades to a one-line text input in native Aurora. This is what makes
  `promo_select` (ticket 07) load-bearing.
- **The block must render correctly with `backgroundColor` absent entirely.**
  Its `styleFieldDefinition` is Blicca-only (upstream registers `blockWidth`
  alone), so the palette cannot function in Aurora however it is declared.
- **The image value is always a bare string or `null`** — never an array, never
  an object — but *read* tolerantly: upstream's `normalizeImageValue` accepts
  `{'@id'}` and `[{'@id'}]` legacy shapes. Blicca writes `../resolveuid/<UID>`
  (relative); upstream writes an absolute `@id` **or any free-text URL an author
  types**. That free-text path makes the image field a **second untrusted-link
  surface**, not just the CTA hrefs.
- **Neither host persists `image_scales` / `image_field`.** `Field.tsx` calls
  `onChange(value)` with one argument and drops the widget's `extras`; Blicca's
  node-patching side channel gates on `@type === 'image'` and is a no-op for
  `promo`. Ticket 10's transformer is the only source, so the schema must be
  renderable from a bare URL with no scales at all.
- **Schema properties are spread into the widget** by
  `BlockSettingsFormRenderer` (`{...schema.properties[key]}`), so upstream-only
  `ImageWidget` props (`imageSize`, `hideLinkPicker`, …) can be set from the
  schema. Conversely `widgetOptions.pattern_options` is **ignored** by the image
  widget in both hosts — do not declare it; restrict-to-`Image` is already
  hardcoded on both sides.

Open here:

- **Exact field ids** for the two action triples and the card link. Avoid `href`
  (the teaser's, carrying reference semantics) and anything colliding with a
  registered widget key — remember resolution is by **field id first**, which is
  how `image` is being used deliberately and how anything else could be broken
  accidentally.
- **The three fieldsets and their contents.** Proposed: *Default*
  (`head_title`, `title`, `description`, `image`, `align`), *Actions* (card
  link, then both triples), *Styling* (`blockWidth`, `backgroundColor`). Each
  fieldset renders as its own `<Accordion>`; only `id: 'default'` auto-expands.
- **Every conditional branch.** `align` is offered only with an image; the card
  link only while both action labels are empty; a variant only where its label
  is set; `backgroundColor` only where the host registers a palette. The schema
  must be the **function form** — there is no declarative `showIf`.
  **Hazard:** `BlockSettingsFormRenderer` dereferences
  `schema.properties[field.name].title` *unguarded*, so every branch must keep
  its property present even when the field is not listed. Enumerate the branches
  and assert each in the vitest suite.
- **Empty and partial states**, for both renderers: label without link, link
  without label, image set then `align` hidden, card link orphaned by a later
  label. Say what renders in each; "degrades without throwing" is the floor.
- **The JSON on disk**, written out in full as a worked example, so 09 and 10
  have something to test against.

Write the resulting schema into the answer verbatim.

## Answer

Settled in the grilling session of 2026-09-02 with md@derico.de. Ten questions
over three rounds; the schema is written verbatim below and is the contract
tickets 07, 08, 09 and 10 build against.

### Three facts read off the host code, which shaped the rest

1. **The schema function receives `{ props, formData, intl }`, not `{ data }`.**
   `BlockSettingsForm.tsx:60` calls `schemaProp({ props, formData, intl })`, and
   upstream's `TeaserSchema` / `ImageSchema` both destructure `{ formData = {} }`.
   `collective.fragmentsblock`'s `FragmentSchema(args?: { data })` reads
   `args.data`, which is therefore **always `undefined`** — harmless there
   because the value only feeds a definition factory, but do not copy that
   signature. The promo's conditionals depend on live form data and must read
   `formData`.

2. **`BlockSettingsFormRenderer` keys its fields by array index**
   (`key={index}`, line 39), and the schema function re-runs on every keystroke
   (form change → `setNodes` → new `formData` → recompute). A conditional field
   that disappears from the *middle* of a fieldset shifts every later field's
   key, so React reuses one field's component instance and DOM node for a
   different field — the input the author is typing in stops being the field the
   character went to. **Conditional fields must therefore be the tail of their
   fieldset.** This is the single constraint that decided the fieldset layout.

3. **`allowExternals` is not implemented in either host's `object_browser`.**
   Zero non-test occurrences in cmsui's `ObjectBrowserWidget`; Blicca substitutes
   it with a `pat-contentbrowser` host that also ignores it. Upstream's teaser and
   image schemas declare the key and the widget drops it. So `object_browser`
   is a content-picker modal only, and **`mailto:` cannot be entered through it in
   either host** — which the first reference case's secondary action requires.

For the record, the full set of widgets registered upstream is `align`, `image`,
`object_browser`, `width`, `size`, `boolean`, `date`, `datetime`, `querystring`,
plus a default `TextField`. Blicca adds `choices` and substitutes four. No field
id below collides with any of them.

### Q1 — the three link fields are free-text strings, upgraded by `promo_link`

`object_browser` was rejected on fact 3: it cannot express the `mailto:` the
reference case needs, and it stores an array of enriched Brains rather than a
string. The fields therefore store a **bare string**.

A picker is not lost, though. A block cannot *import* either host's picker —
Blicca's is `pat-contentbrowser` behind `PatternHost` (absent from npm-installed
Aurora) and upstream's calls `useLoaderData` from the edit route (ADR 0009: it
"would crash under the one-route MemoryRouter"). But it can **look one up**:
`config.getWidget('object_browser')` returns whichever implementation the host
registered, and each functions in its own host. Upstream's own teaser picks its
target from the block sidebar that way, which is the evidence it works there.

`promo_link` (ticket 07, now a third widget) is therefore a composite: a text
input over the stored string, plus a browse button that renders the host's
registered `object_browser` and writes the picked brain's `@id` back into the
same string. Free text and `mailto:` keep working; internal targets get a picker.

**The storage is identical either way** — that is why this is an addition rather
than a reversal. If `promo_link` slips, dropping the `widget` key leaves a plain
text field over the same string, and adding it later is a minor release with no
migration.

Accepted consequence: **the stored path differs by host**, exactly as the image
field already does (ticket 01) — Blicca writes a relative `../resolveuid/<UID>`,
upstream an absolute `@id`. Both are strings the server resolves and both pass
the screen below. This puts three more fields on a footing the block already had.

### Q2 — field ids

`card_link`; `cta_primary_label` / `cta_primary_link` / `cta_primary_variant`;
`cta_secondary_label` / `cta_secondary_link` / `cta_secondary_variant`.

`_link`, never `_href` — `href` is the teaser's and carries reference semantics.
Symmetric `cta_primary_*` / `cta_secondary_*` rather than the hero's asymmetric
`cta_*` / `link_*`, because the glossary makes these a fixed pair naming
*appearance, not order*; asymmetric ids would quietly reintroduce a ranking.

### Q3 — `backgroundColor` is declared, by mechanism

Declared using `collective.fragmentsblock`'s `backgroundField()` verbatim: it
reads the host's registered `styleFieldDefinition`s and returns `null` when there
are none, so the field is present in Blicca and absent in Aurora **by mechanism**
rather than by a flag we maintain. Computed once from the registry at
schema-build time, never from form data, so fact 2 does not touch it.

**Revisit trigger (md's condition):** if and when Aurora proper registers block
background colours upstream, reopen this. `backgroundField()` will then start
returning a field in Aurora too — the intended behaviour, but it means the block
gains a control in a host it was specified to render without. Check then that the
neutral-slot default and the image-less reference case still hold in Aurora.
**This note belongs as a comment on the `backgroundField()` call site**, so it is
found from the code and not only from this ticket.

### Q4 — three conditionals kept, one dropped

| conditional | trigger | verdict |
|---|---|---|
| `align` offered only with an image | modal image pick | **kept** — last in Default |
| `backgroundColor` only where the host registers a palette | registry, once | **kept** — last in Styling |
| `card_link` offered only while both action labels are empty | typing | **kept**, by moving `card_link` to the **end** of Actions |
| a variant offered only where its label is set | typing | **dropped** |

The card link keeps CONTEXT.md's rule intact: as the tail of its fieldset it can
appear and disappear without reindexing anything the author is touching.

The variant conditional is the one revision to the previously settled list. A
variant sits mid-triple (`label`, `link`, `variant`, `label`, …), so it cannot be
made a tail without separating each variant from the label and link it modifies —
a worse sidebar than simply always showing it. It has a default and reads fine
beside an empty label, so the conditional bought nothing worth a reindex.
**Both variants are therefore always visible.**

### Q5 — nothing is seeded, and both renderers carry the fallbacks

Unlike `derico-hero`, which seeds the mockup's German copy at insert time, the
Promo seeds **nothing**. A generic block has no copy that is right for every
site, and a plausible-looking default that belongs to one site is worse than an
empty field. A fresh promo is a node carrying `@type` plus whatever the host
materialises. Ticket 08's canvas earns its keep by showing a labelled empty
skeleton so the author can see which slot is which.

Consequently the schema's `default` keys are **not** a storage guarantee — they
are spread into the widget as props and are not reliably written to the node. Both
renderers must apply the same fallbacks independently:

- `cta_*_variant` absent ⇒ **`button`**
- `align` absent ⇒ **`center`** (image above the copy)
- `blockWidth` absent ⇒ **`default`**

Stating these here is what stops 08 and 09 from each inventing their own.

### Q6 — three fieldsets, one conditional each, always last

| fieldset | `id` | fields (conditional in bold) |
|---|---|---|
| Default (auto-expands) | `default` | `head_title`, `title`, `description`, `image`, **`align`** |
| Actions | `actions` | `cta_primary_label`, `cta_primary_link`, `cta_primary_variant`, `cta_secondary_label`, `cta_secondary_link`, `cta_secondary_variant`, **`card_link`** |
| Styling | `styling` | `blockWidth`, **`backgroundColor`** |

**The invariant is "exactly one conditional field per fieldset, and it is last".**
That is mechanically assertable and ticket 08's suite should hold it, so a future
edit cannot quietly reintroduce fact 2's hazard.

It also forces the fieldset count: folding Styling into Default would place
`blockWidth` after `align` and `align` would stop being a tail. Only `default`
auto-expands — each fieldset renders its own `<Accordion defaultExpandedKeys={['default']}>`,
so the id is what opens it.

### Q7 — one link screen, spelled twice

`path_of()` cannot be used: `urlparse("mailto:…").path` is truthy, so the scheme
is stripped. Q1 made all three links author-typed free text, and ticket 01 found
the image field is a fourth such surface upstream. An **allowlist** therefore, not
a blocklist — a blocklist fails open on the scheme nobody thought of, and this
input is typed by hand.

- **Links** (`card_link`, both `cta_*_link`): site-relative paths, `http`,
  `https`, `mailto`, `tel`. Anything else renders as text with **no `href`**.
- **Image `src`**: relative, `http`, `https` only — `mailto` and `tel` are
  meaningless there.

Implemented as one table spelled twice, exactly like `collective.fragmentsblock`'s
coercion table, with paired tests — `TestScreenParity` plus its vitest
counterpart, extended together or not at all.

### Q8 — empty and partial states

Both renderers behave identically. The editor canvas adds a nag on top; it never
renders something different.

| stored state | both renderers |
|---|---|
| nothing filled in | block root with its anatomy classes, empty inside |
| action label, no link | **action renders nothing** |
| action link, no label | action renders nothing |
| both labels empty, `card_link` set | whole block wrapped in one `<a>` |
| any label set, `card_link` also set (orphaned) | card link ignored; the actions take the clicks |
| image set, `align` absent | `center` — image above the copy |
| `align` set, image later cleared | `align` ignored; the stored value survives untouched |
| link fails the Q7 screen | rendered as text, no `href` |
| `backgroundColor` stored, host registers no palette | no style, no class |

Row 2 matches `derico-hero`'s `link()`, which is symmetric for the same reason: a
button that goes nowhere is worse than an absent one, and the author is not left
guessing because the canvas names the half-filled action.

No state throws. Never both a card link and an action link — no interactive
element is ever nested inside another.

### A correction to this ticket's own hazard note

The question text says "every branch must keep its property present even when the
field is not listed". Read against the renderer, the crash condition is the
**inverse**: `schema.properties[schemaField]` and
`schema.properties[field.name].title` are dereferenced only while mapping over
`fieldset.fields`, so a property that exists but is unlisted is merely unused,
while a field **listed without a property crashes**.

Keeping every property always declared is still the right habit — it is what both
upstream schemas do — but the vitest assertion must be *"every field listed in any
fieldset has a property"*, not *"every property is always present"*. The weaker
assertion would pass while the crash shipped.

### The schema, verbatim

```ts
import { getStyleFieldDefinitionsFromRegistry } from '@plone/helpers';

export const PROMO_BLOCK_TYPE = 'promo';

const BACKGROUND_FIELD_NAME = 'backgroundColor';

/** The two action slots, in sidebar order. "primary" names appearance, not rank. */
const CTA_SLOTS = ['primary', 'secondary'] as const;

const LABEL_FIELDS = CTA_SLOTS.map((slot) => `cta_${slot}_label`);

/** Tolerant truthiness: the value may be null, or a legacy object/array shape. */
function filled(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== '';
  return value != null && value !== false;
}

/**
 * Backgrounds are the host's palette, not ours — `backgroundField` returns null
 * where the host registers none, so the control is absent in Aurora proper by
 * mechanism rather than by a flag. Verbatim from collective.fragmentsblock.
 *
 * REVISIT (ticket 03, 2026-09-02): if Aurora proper ever registers block
 * background colours upstream, this starts returning a field there too. That is
 * intended, but it hands the block a control it was specified to render without
 * — recheck the neutral-slot default and the image-less reference case then.
 */
function backgroundField(data: Record<string, unknown>) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: PROMO_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME,
  });
  const choices = definitions
    .filter((definition) => typeof definition?.name === 'string')
    .map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: 'Background',
    choices,
    ...(choices.some(([name]) => name === 'none') ? { default: 'none' } : {}),
    styleField: true,
  };
}

/** One action slot: a label, a link and a variant. Both variants always shown. */
function ctaProperties(slot: 'primary' | 'secondary') {
  const label = slot === 'primary' ? 'Primary' : 'Secondary';
  return {
    [`cta_${slot}_label`]: { title: `${label} action label` },
    [`cta_${slot}_link`]: {
      title: `${label} action link`,
      // Free text, not `object_browser`: neither host implements
      // `allowExternals`, so a picker cannot express the mailto: the first
      // reference case needs. `promo_link` wraps the host's OWN registered
      // object_browser behind a text input, so internal targets stay pickable
      // while the stored value remains a bare string.
      widget: 'promo_link',
    },
    [`cta_${slot}_variant`]: {
      title: `${label} action style`,
      // `widget` outranks `choices` in Field.tsx's resolution order, and
      // `choices` is registered in Blicca only — so a promo field relying on it
      // would silently degrade to a text input in Aurora. promo_select reads
      // the `choices` prop spread from this property.
      widget: 'promo_select',
      choices: [
        ['button', 'Button'],
        ['link', 'Link'],
      ],
      // NOT a storage guarantee — both renderers default to `button` themselves.
      default: 'button',
    },
  };
}

/**
 * The Promo's sidebar form.
 *
 * The argument is `{ formData }`, NOT `{ data }` — BlockSettingsForm.tsx calls
 * `blockSchema({ props, formData, intl })`. (collective.fragmentsblock reads
 * `args.data` and always gets undefined; do not copy it.)
 *
 * INVARIANT: each fieldset holds exactly ONE conditional field and it is LAST.
 * BlockSettingsFormRenderer keys fields by array index, and this function re-runs
 * on every keystroke, so a field vanishing from the middle of a fieldset makes
 * React reuse one field's DOM node for another. Asserted in the vitest suite.
 */
export function PromoSchema({
  formData = {},
}: { formData?: Record<string, unknown> } = {}) {
  const hasImage = filled(formData.image);
  const hasAnyLabel = LABEL_FIELDS.some((field) => filled(formData[field]));
  const background = backgroundField(formData);

  return {
    title: 'Promo',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: [
          'head_title',
          'title',
          'description',
          'image',
          ...(hasImage ? ['align'] : []),
        ],
      },
      {
        id: 'actions',
        title: 'Actions',
        fields: [
          'cta_primary_label',
          'cta_primary_link',
          'cta_primary_variant',
          'cta_secondary_label',
          'cta_secondary_link',
          'cta_secondary_variant',
          ...(hasAnyLabel ? [] : ['card_link']),
        ],
      },
      {
        id: 'styling',
        title: 'Styling',
        fields: ['blockWidth', ...(background ? [BACKGROUND_FIELD_NAME] : [])],
      },
    ],
    properties: {
      // Aurora's spellings on disk, the author's words in the sidebar — so a
      // teaser<->promo migration stays a rename-free copy.
      head_title: { title: 'Kicker' },
      title: { title: 'Title' },
      // Namespaced, never the generic `textarea`: claiming that key would
      // silently change every other block's fields in this host.
      description: { title: 'Description', widget: 'promo_textarea' },

      // Named `image` DELIBERATELY. getWidgetByFieldId(id ?? name) runs first
      // and unconditionally on the schema property key, and config.getWidget
      // searches all categories flat — so both hosts hand this field their own
      // image widget, upload included, with no `widget` key needed. This is the
      // exact INVERSE of derico-hero's rule, which avoided the name to protect
      // its own widget; here the host's widget is the thing we want. Do not
      // "fix" this by renaming it or by matching Aurora's image block, which
      // spells it `url` + widget: 'image'.
      image: { title: 'Image' },

      // A plain data field, not a style field (mirroring Aurora's image block),
      // so no plugin emits its modifier class — both renderers emit
      // `has--align--<value>` themselves. `center` means image ABOVE the copy.
      align: {
        title: 'Image placement',
        description: 'Where the picture sits. “Center” places it above the text.',
        widget: 'align',
        actions: ['left', 'right', 'center'],
        default: 'center',
      },

      ...ctaProperties('primary'),
      ...ctaProperties('secondary'),

      // The Promo's own target, offered only while both action labels are empty.
      // A value set earlier survives hidden and returns when the labels clear.
      // Last in its fieldset so appearing and disappearing reindexes nothing.
      card_link: {
        title: 'Card link',
        description:
          'Makes the whole promo clickable. Ignored while either action has a label.',
        widget: 'promo_link',
      },

      blockWidth: {
        title: 'Block width',
        widget: 'width',
        default: 'default',
        styleField: true,
      },
      ...(background ? { [BACKGROUND_FIELD_NAME]: background } : {}),
    },
    // Everything is authored, so everything can be left blank.
    required: [],
  };
}

export default PromoSchema;
```

### The JSON on disk

**Reference case A — derico.de's closing call to action.** Image-less, centred,
full width, both actions, the secondary one a `mailto:`. Exercises the image-less
path and the non-http scheme that defeats `path_of`.

```json
{
  "@type": "promo",
  "head_title": "Kontakt",
  "title": "Erstgespräch vereinbaren",
  "description": "Erzählen Sie uns von Ihrem Vorhaben — wir melden uns innerhalb von zwei Werktagen.",
  "cta_primary_label": "Termin vereinbaren",
  "cta_primary_link": "/kontakt",
  "cta_primary_variant": "button",
  "cta_secondary_label": "md@derico.de",
  "cta_secondary_link": "mailto:md@derico.de",
  "cta_secondary_variant": "link",
  "blockWidth": "full",
  "backgroundColor": "tinted"
}
```

No `image`, so no `align` was ever offered and none is stored — the renderers
fall back to `center`, which is what an image-less promo wants anyway. No
`card_link`, because both labels are set: the field was never offered, and would
be ignored at render if an older node carried one. `backgroundColor` is present
only because this node was authored in Blicca; the same node renders correctly in
Aurora with the key simply unresolved.

**Reference case B — image beside the copy.** Exercises `left` placement, the
picked-image path and a single action.

```json
{
  "@type": "promo",
  "head_title": "Open Source",
  "title": "Plone für langlebige Anwendungen",
  "description": "Ein CMS, das seit über zwanzig Jahren migrierbar bleibt.",
  "image": "../resolveuid/8f2c1a9e4b7d4f0a9c3e5d6b7a8f9e01",
  "align": "left",
  "cta_primary_label": "Mehr erfahren",
  "cta_primary_link": "/leistungen/plone",
  "cta_primary_variant": "button",
  "cta_secondary_variant": "button",
  "blockWidth": "default"
}
```

Two things to notice, both deliberate. `cta_secondary_variant` is stored while
`cta_secondary_label` and `cta_secondary_link` are not — the variant is always
visible now (Q4), so an author who touched the control leaves a value behind on a
slot that renders nothing; per Q8 the empty slot renders nothing regardless.
And `image` carries Blicca's relative `../resolveuid/<UID>`; the same block
authored in Aurora would carry an absolute `@id` or a typed URL, which is
ticket 10's problem, not the schema's.

The host also stores Plate's own `id`, `type` and `children` on the node.
`SidebarPlugin` strips all three before handing `formData` to the schema and
strips them again from the patch, so the block never sees or writes them.

### What this hands the downstream tickets

- **07** grows a third widget, `promo_link` (see Q1). `promo_select` reads the
  `choices` prop spread from the schema property.
- **08** and **09** build against the schema and the Q8 table verbatim, and both
  apply the Q5 fallbacks themselves.
- **09** also owns the Q7 screen server-side; **08** owns its twin.
- **10** is still the only source of image scales, and the schema is renderable
  from a bare URL with none.
- **A new ticket** owns the anatomy class list that 08 and 09 must both emit —
  see the map. It did not exist, and without it the two markup tickets could run
  in parallel and diverge.


## Comments

### Grilling round 1 (2026-09-02, with md@derico.de)

**Q3 — is `backgroundColor` declared at all? — SETTLED: yes.**

Declared using `collective.fragmentsblock`'s `backgroundField()` verbatim: it
reads the host's registered `styleFieldDefinition`s and returns `null` when the
host registers none, so the field is present in Blicca and absent in Aurora **by
mechanism**, not by a flag we maintain. The conditional is computed once from the
registry at schema-build time, never from form data, so it is unaffected by the
`key={index}` reindexing hazard below.

**Revisit trigger (md's condition):** if and when Aurora proper registers block
background colours upstream, reopen this decision. `backgroundField()` would then
start returning a field in Aurora too, silently — which is the intended
behaviour, but it means the block gains a control in a host it was specified to
render without. Check at that point that the neutral-slot default and the
image-less reference case still hold in Aurora. Carry this note as a comment on
the `backgroundField()` call site so it is found from the code, not only here.

Rounds 2 and 3 followed on 2026-09-02; all ten questions are
settled and written up under `## Answer` above.
