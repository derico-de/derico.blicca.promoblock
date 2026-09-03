/**
 * The Promo's sidebar form — ticket 03's schema, written verbatim.
 *
 * Three host facts shaped it, and each is load-bearing:
 *
 * 1. The schema function receives `{ props, formData, intl }`, **not**
 *    `{ data }`. `BlockSettingsForm.tsx:60` calls
 *    `schemaProp({ props, formData, intl })`, and upstream's `TeaserSchema`
 *    and `ImageSchema` both destructure `{ formData = {} }`.
 *    `collective.fragmentsblock`'s `FragmentSchema(args?: { data })` reads
 *    `args.data` and therefore always gets `undefined` — harmless there,
 *    because the value only feeds a definition factory. Do not copy it: the
 *    promo's conditionals depend on live form data.
 *
 * 2. `BlockSettingsFormRenderer` keys its fields by ARRAY INDEX
 *    (`key={index}`, line 39) and this function re-runs on every keystroke
 *    (form change → `setNodes` → new `formData` → recompute). A conditional
 *    field that disappears from the MIDDLE of a fieldset shifts every later
 *    field's key, so React reuses one field's component instance and DOM node
 *    for a different field — the input the author is typing in stops being the
 *    field the character went to. Hence the invariant below.
 *
 * 3. `allowExternals` is implemented in NEITHER host's `object_browser` (zero
 *    non-test occurrences in cmsui's `ObjectBrowserWidget`; Blicca substitutes
 *    a `pat-contentbrowser` host that ignores it too). So a picker cannot
 *    express the `mailto:` reference case A needs, and the three link fields
 *    are bare strings behind `promo_link`, which looks the host's own picker
 *    up rather than importing either.
 *
 * INVARIANT: each fieldset holds exactly ONE conditional field and it is
 * LAST. Asserted in the vitest suite, so fact 2's hazard cannot creep back.
 */
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
 * Backgrounds are the host's palette, not ours — `backgroundField` returns
 * `null` where the host registers none, so the control is absent in Aurora
 * proper BY MECHANISM rather than by a flag we maintain. Verbatim from
 * `collective.fragmentsblock`. Computed from the registry at schema-build
 * time, never from form data, so fact 2 does not touch it.
 *
 * REVISIT (ticket 03, 2026-09-02): if Aurora proper ever registers block
 * background colours upstream, this starts returning a field there too. That
 * is intended, but it hands the block a control it was specified to render
 * without — recheck the neutral-slot default and the image-less reference
 * case then.
 */
function backgroundField(data: Record<string, unknown>) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: PROMO_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME,
  }) as Array<{ name?: unknown; label?: unknown }>;
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
      // `choices` is registered in Blicca only — so a promo field relying on
      // it would silently degrade to a text input in Aurora. promo_select
      // reads the `choices` prop spread from this property.
      widget: 'promo_select',
      choices: [
        ['button', 'Button'],
        ['link', 'Link'],
      ],
      // NOT a storage guarantee — both renderers default to `button`
      // themselves (ticket 03 Q5, implemented in `promo/data.ts`).
      default: 'button',
    },
  };
}

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
