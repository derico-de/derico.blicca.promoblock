/**
 * Ticket 03's schema, and the mechanical invariant that keeps it safe.
 *
 * The two assertions that matter most are not about any single field:
 *
 *  1. **Exactly one conditional field per fieldset, and it is LAST.**
 *     `BlockSettingsFormRenderer` keys fields by array index and the schema
 *     recomputes on every keystroke, so a conditional field vanishing from
 *     the middle of a fieldset makes React reuse one field's DOM node for
 *     another — the input the author is typing in stops being the field the
 *     character went to. Asserted by DIFFING the field lists across every
 *     combination of the conditions, so a future edit that moves a
 *     conditional field inward fails here rather than in the sidebar.
 *
 *  2. **Every field listed in any fieldset has a property.** Ticket 03
 *     corrected its own hazard note here: `schema.properties[field.name].title`
 *     is dereferenced while mapping over `fieldset.fields`, so a property that
 *     exists but is unlisted is merely unused, while a field listed WITHOUT a
 *     property crashes the sidebar. The inverse assertion would pass while the
 *     crash shipped.
 *
 * Mounted against the UPSTREAM registry fixture, so `backgroundColor` is
 * absent here exactly as it is in Aurora proper — which is the whole point of
 * declaring it through `backgroundField()` rather than a flag.
 */
import { describe, expect, it } from 'vitest';
import config from '@plone/registry';

import PromoSchema from '../src/promo/schema';
import { installUpstreamRegistry } from './upstream-registry';

const upstream = installUpstreamRegistry(config as any);

type Schema = ReturnType<typeof PromoSchema>;

const fieldsOf = (schema: Schema, id: string): string[] =>
  schema.fieldsets.find((fieldset) => fieldset.id === id)?.fields ?? [];

/** Every combination of the two form-data conditions ticket 03 kept. */
const STATES = [
  { name: 'empty', formData: {} },
  { name: 'with an image', formData: { image: '../resolveuid/abc' } },
  { name: 'with a label', formData: { cta_secondary_label: 'Mehr' } },
  {
    name: 'with both',
    formData: { image: '../resolveuid/abc', cta_primary_label: 'Los' },
  },
] as const;

describe('the signature', () => {
  it('reads formData, not data — BlockSettingsForm passes { props, formData, intl }', () => {
    // The bug this pins: `FragmentSchema(args?: { data })` reads args.data and
    // always gets undefined. Copying that signature here would make every
    // conditional permanently false.
    expect(fieldsOf(PromoSchema({ formData: { image: '/pic' } }), 'default')).toContain(
      'align',
    );
    expect(
      fieldsOf(PromoSchema({ data: { image: '/pic' } } as any), 'default'),
    ).not.toContain('align');
  });

  it('survives being called with no argument at all', () => {
    expect(() => PromoSchema()).not.toThrow();
    expect(PromoSchema().title).toBe('Promo');
  });
});

describe('the fieldsets', () => {
  it('are exactly the three ticket 03 fixed, in order', () => {
    expect(PromoSchema().fieldsets.map((fieldset) => fieldset.id)).toEqual([
      'default',
      'actions',
      'styling',
    ]);
  });

  it('put `align` last in Default, and only with an image', () => {
    expect(fieldsOf(PromoSchema(), 'default')).toEqual([
      'head_title',
      'title',
      'description',
      'image',
    ]);
    const fields = fieldsOf(PromoSchema({ formData: { image: '/pic' } }), 'default');
    expect(fields.at(-1)).toBe('align');
  });

  it('put `card_link` last in Actions, and only while both labels are empty', () => {
    expect(fieldsOf(PromoSchema(), 'actions').at(-1)).toBe('card_link');
    for (const field of ['cta_primary_label', 'cta_secondary_label']) {
      expect(
        fieldsOf(PromoSchema({ formData: { [field]: 'x' } }), 'actions'),
      ).not.toContain('card_link');
    }
  });

  it('always show both variants — the mid-triple conditional was dropped', () => {
    // It cannot be made a tail without separating each variant from the label
    // and link it modifies, so it was traded away for a stable sidebar.
    for (const state of STATES) {
      expect(fieldsOf(PromoSchema(state), 'actions')).toEqual(
        expect.arrayContaining(['cta_primary_variant', 'cta_secondary_variant']),
      );
    }
  });

  it('omit backgroundColor against an upstream registry — absent by mechanism', () => {
    expect(upstream.getUtility({
      type: 'styleFieldDefinition',
      name: 'backgroundColor',
    }).method).toBeUndefined();
    expect(fieldsOf(PromoSchema(), 'styling')).toEqual(['blockWidth']);
    expect(PromoSchema().properties).not.toHaveProperty('backgroundColor');
  });
});

describe('THE INVARIANT: one conditional field per fieldset, and it is last', () => {
  // Read off the states rather than declared: whatever varies IS the
  // conditional set, so adding a conditional field anywhere is caught.
  const listsFor = (id: string) => STATES.map((state) => fieldsOf(PromoSchema(state), id));

  for (const id of ['default', 'actions', 'styling']) {
    it(`holds for the ${id} fieldset`, () => {
      const lists = listsFor(id);
      const longest = lists.reduce((a, b) => (b.length > a.length ? b : a));
      const shortest = lists.reduce((a, b) => (b.length < a.length ? b : a));

      // At most one field ever varies…
      expect(longest.length - shortest.length).toBeLessThanOrEqual(1);
      // …and the shorter list is the longer one with its TAIL removed, which
      // is what "conditional and last" means mechanically. Any inward
      // conditional makes this a mismatch instead.
      expect(longest.slice(0, shortest.length)).toEqual(shortest);
      for (const list of lists) {
        expect(longest.slice(0, list.length)).toEqual(list);
      }
    });
  }
});

describe('properties', () => {
  it('declare one for every field listed in any state', () => {
    for (const state of STATES) {
      const schema = PromoSchema(state);
      for (const fieldset of schema.fieldsets) {
        for (const field of fieldset.fields) {
          expect(schema.properties, `${state.name}: ${field}`).toHaveProperty(field);
          expect((schema.properties as any)[field].title).toBeTruthy();
        }
      }
    }
  });

  it('name the image field `image` so field-id resolution hands it the host widget', () => {
    // Deliberately the inverse of derico-hero's rule: here the host's own
    // image widget, upload included, is the thing we want. Both hosts
    // register it, and getWidget searches every category flat.
    expect(PromoSchema().properties.image).toEqual({ title: 'Image' });
    expect(upstream.getWidget('image')).toBeDefined();
  });

  it('route the three link fields and the description through namespaced widgets', () => {
    const properties = PromoSchema().properties as Record<string, any>;
    expect(properties.description.widget).toBe('promo_textarea');
    for (const field of ['card_link', 'cta_primary_link', 'cta_secondary_link']) {
      expect(properties[field].widget).toBe('promo_link');
    }
    for (const field of ['cta_primary_variant', 'cta_secondary_variant']) {
      expect(properties[field].widget).toBe('promo_select');
      // `widget` outranks `choices` in Field.tsx, and `choices` is
      // Blicca-only — leaning on it would degrade to a text input in Aurora.
      expect(upstream.getWidget('choices')).toBeUndefined();
    }
  });

  it('keep `align` a plain data field and `blockWidth` a style field', () => {
    const properties = PromoSchema().properties as Record<string, any>;
    // No plugin stamps a plain data field, which is why both renderers emit
    // `has--align--<value>` themselves.
    expect(properties.align.styleField).toBeUndefined();
    expect(properties.blockWidth.styleField).toBe(true);
  });

  it('require nothing — a half-authored promo must save', () => {
    expect(PromoSchema().required).toEqual([]);
  });
});
