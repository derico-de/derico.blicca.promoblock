# Research: does the host `image` widget behave in both hosts?

Type: research
Status: resolved
Blocked by: —

## Question

The map fixes the image field as **named `image`, taking the host's own widget
through field-id resolution**. That is a deliberate inversion of `derico-hero`'s
rule and the single largest assumption in the content model. Confirm or break it
before ticket 03 writes the schema.

Read, don't guess. Sources: `@plone/cmsui/components/Form/Field.tsx` (resolution
order), `@plone/cmsui/components/ImageWidget/ImageWidget.tsx` (upstream),
`plone.blicca.auroraeditor/wrapper/src/widgets/ImageWidget.tsx` (the Blicca
substitute), `@plone/blocks/Image/schema.tsx` (how Aurora's own image block
declares its field).

- **Resolution.** Confirm `getWidgetByFieldId('image')` really wins over an
  explicit `widget:` key, and that both hosts register under exactly `image`.
  If Blicca registers under a different key or category, the whole approach
  falls over.
- **Stored shape.** Upstream calls `onValueChange(result['@id'], extras)` — an
  absolute `@id` string. Blicca writes `../resolveuid/${item.UID}` — a relative
  path string. Same type, different form. Confirm both, and confirm neither ever
  writes an array or an object, because the view and the template must accept
  whatever comes.
- **`image_scales` / `image_field`.** Upstream passes them as `extras` to
  `onChange`, but Aurora's `dataAdapter` hook is **vestigial** (zero consumers),
  so nothing may be catching them. Determine whether either host persists them
  at all. If neither does, ticket 10's transformer is the only source and that
  is fine — but it must be known, not assumed.
- **`widgetOptions.pattern_options`.** Contract §1.5 says `selectableTypes` and
  `upload` are read. Check whether the *host image widget* honours them, or only
  `object_browser` does. If it ignores them, we lose "restrict to Image" and
  need to decide whether that matters.
- **The fallback.** If any of the above breaks, the alternative is the teaser's
  idiom — `object_browser`, `mode: 'single'`, `selectableTypes: ['Image']`,
  `upload: true`, under a field name that is *not* `image`. Say which, and what
  it costs in native Aurora (where the Blicca upload substitution is absent).

## Answer

**Verdict: the assumption holds. Name the field `image` and it gets the host's
own image widget in both hosts.** Every sub-question below was read off the
source, not inferred. Two corrections to the map's reasoning and one new
cross-host divergence came out of it.

### 1. Resolution — confirmed, but for a different reason than the map assumed

`components/Form/Field.tsx` (`renderFieldWidget`) resolves in this order:

    getWidgetByFieldId(id ?? name)   <-- FIRST, unconditional
    getWidgetFromTaggedValues(...)
    getWidgetByName(widget)          <-- an explicit `widget:` key only gets here
    getWidgetByChoices / ByVocabulary / ByVocabularyFromHint / ByFactory / ByType
    getWidgetDefault()

So yes — **field-id beats an explicit `widget:` key**, and a field named `image`
can never have that resolution overridden from the schema.

The key that resolution uses is the **schema property key**.
`BlockSettingsFormRenderer.tsx` renders each field as
`<field.Quanta {...schema.properties[key]} name={field.name} ... />` and passes
no `id`, so `id ?? name` is the property key. Blicca imports that exact
component (`plone-block-sidebar.tsx:14` imports upstream's `BlockSettingsForm`),
so **the resolution path is byte-identical in both hosts** — there is no Blicca
fork to diverge.

**Correction to the map's stated mechanism.** The map says both hosts register
`image` and implies category matters. It does not: `config.getWidget(key)`
(`@plone/registry/dist/index.js:397`) **iterates every category and returns the
first match by key**, so `id`/`widget`/`type`/`vocabulary`/`factory` are
effectively one flat namespace. Both hosts in fact register `image` under
category **`widget`**, not `id`:

- upstream `cmsui/config/widgets.ts:41` — `{key:'widget', definition:{image: ImageWidget}}`
- Blicca `wrapper/src/bootstrap/config.ts:47` — `{key:'widget', definition:{image: BliccaImageWidget}}`

Field-id resolution finds them anyway. The conclusion is unchanged; the reason
is. **Consequence worth writing into the code comment ticket 03 asks for:** the
flat namespace is also why the map's `promo_textarea` / `promo_select`
namespacing is safe *and* why it is necessary — one flat namespace across all
categories means an unprefixed `textarea` really would collide ecosystem-wide.

**Aurora's own image block does NOT use this idiom.** `blocks/Image/schema.tsx`
names the field **`url`** with `widget: 'image'`. Both routes work; we are
choosing the more robust one (field-id cannot be knocked out of first place),
at the cost of not matching upstream's spelling. Take it deliberately — the map
already says to comment it.

### 2. Stored shape — always a bare string or `null`. Never an array, never an object.

| host | write path | value written |
|---|---|---|
| Blicca | contentbrowser pick | `` `../resolveuid/${item.UID}` `` (relative), or `item['@id']` if no UID |
| Blicca | clear | `null` |
| upstream | object-browser pick | `selectedImage['@id']` — **absolute** |
| upstream | file upload | `result['@id']` from `@createContent` — **absolute** |
| upstream | **free-text link input** | any trimmed string the author types, or `null` |
| upstream | clear | `null` |

Neither host ever writes an array or an object. Upstream's `normalizeImageValue`
does *read* `['@id']` and `[{'@id'}]` shapes tolerantly (legacy Volto defence),
so tickets 09/10 should **accept** those on read while only ever **writing** a
string.

### 3. `image_scales` / `image_field` — neither host persists them. Ticket 10 is the only source.

Confirmed on both sides, and the reason is the same on both:

- `Field.tsx` wires `onChange={(value) => { fieldProps.onChange?.(value); onFieldChange(value); }}`
  — **one argument. The `extras` second argument is dropped on the floor.**
- Upstream's widget never had them to give: its extras are `{title}` only
  (`onValueChange(result['@id'], {title})`). It never emits `image_scales` or
  `image_field` at all.
- Blicca's widget *does* pass `{title, image_field, image_scales}`, but through
  that same discarded second argument.
- Blicca's side-channel `patchSelectedImageBlock` writes them straight onto the
  node — but `isImagePloneBlock()` gates on `node['@type'] === 'image'`, so for
  `@type: 'promo'` **it is a no-op**. Good news twice over: nothing corrupts our
  node, and nothing populates it either.

So ticket 10's transformer pair is not merely "the only source" — it is
load-bearing, and the block must render correctly from a bare URL string with no
scales present at all.

### 4. `widgetOptions.pattern_options` — ignored by the image widget in both hosts. No loss.

Contract §1.5 is describing `object_browser`, not the image widget:

- **upstream `ImageWidget`** takes `restrictFileUpload`, `hideLinkPicker`,
  `hideObjectBrowserPicker`, `objectBrowserPickerType`, `imageSize`,
  `uploadPath`, `currentPath` as **direct props**, and **hardcodes**
  `pattern_options: { selectableTypes: ['Image'] }` in its own internal
  `ObjectBrowserProvider`.
- **Blicca `BliccaImageWidget`** hardcodes `selectableTypes={['Image']}` and
  `upload` on its `PatternHost`.
- `ObjectBrowserWidget` *is* the one that honours
  `widgetOptions.pattern_options.selectableTypes` (`ObjectBrowserWidget/utils.ts:99-109`).

**We lose nothing**: restrict-to-`Image` is what we wanted and both hosts do it
unconditionally. We simply cannot *configure* it. Do not declare
`widgetOptions.pattern_options` on the image field — it would be dead weight
that reads as if it were doing something.

**A live lever we do get instead:** `BlockSettingsFormRenderer` spreads
`{...schema.properties[key]}` into the widget, so any key on the schema property
arrives as a widget prop. Upstream-only props like `imageSize` or
`hideLinkPicker` can therefore be set from the schema — harmlessly ignored by
Blicca's widget, which does not read them.

### 5. NEW — a cross-host value-space divergence the map had not anticipated

This did not come from the four bullets but is the biggest thing the reading
turned up, and it lands on tickets 09, 10 and 15:

1. **Blicca writes relative, upstream writes absolute.** A promo authored in
   Blicca stores `../resolveuid/<UID>`. Upstream's own preview helper is
   `getPreviewSrc(url) = url.startsWith('/') ? url + '/@@images/image/<size>' : url`
   — `../resolveuid/...` does **not** start with `/`, so **native Aurora would
   render a Blicca-authored promo's image as a raw, broken `src`.** It is only
   the editing preview, not the published page, but ticket 15 must expect it
   rather than read it as a build error.
2. **Upstream offers a free-text URL input; Blicca does not.** In native Aurora
   an author can type an arbitrary external URL into the image field. So the
   server renderer's link screening (the `path_of` / non-http item in the map's
   constraints) is **not confined to the action links — the image field is a
   second free-text surface**, reachable only from the native host. Ticket 09
   should screen the image value too, not just the CTA hrefs.

### Fallback — not needed, and it would cost more than it saves

Recorded for completeness since the ticket asked. The `object_browser` /
`mode:'single'` / `selectableTypes:['Image']` / `upload:true` idiom under a
non-`image` field name is **worse in native Aurora**: upstream's
`ObjectBrowserWidget` has **no upload at all** (the `upload` flag is Blicca's
`PatternHost` extension; nothing upstream reads it). Choosing it would trade a
working upload in both hosts for a picker that can only select pre-existing
images in one of them. Stay with the field named `image`.
