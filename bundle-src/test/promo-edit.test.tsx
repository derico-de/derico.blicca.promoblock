/**
 * The `edit` half: the canvas is the public rendering plus honesty, and
 * nothing else.
 *
 * Two claims, and they fail for different reasons:
 *
 *  1. **It delegates.** `edit` renders `view` — so the anatomy cannot drift
 *     between the surfaces, and the block has one markup implementation on
 *     this side rather than two.
 *  2. **It is honest.** Nothing is seeded (ticket 03 Q5) and ticket 17 rule 3
 *     keeps the block root empty when there is nothing in it, so without the
 *     skeleton a fresh promo is a blank box. And every Q8 row that silently
 *     discards something the author typed is announced HERE — which is the
 *     reason those rows are allowed to be silent on the public page.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import PromoEdit from '../src/promo/PromoEdit';
import PromoView from '../src/promo/PromoView';
import { missing, warnings, type PromoData } from '../src/promo/data';

const html = (data: PromoData) => render(<PromoEdit data={data} />).container.innerHTML;

const REFERENCE_A: PromoData = {
  head_title: 'Kontakt',
  title: 'Erstgespräch vereinbaren',
  description: 'Erzählen Sie uns von Ihrem Vorhaben.',
  cta_primary_label: 'Termin vereinbaren',
  cta_primary_link: '/kontakt',
  cta_primary_variant: 'button',
  cta_secondary_label: 'md@derico.de',
  cta_secondary_link: 'mailto:md@derico.de',
  cta_secondary_variant: 'link',
};

describe('delegation', () => {
  it('renders exactly `view` in edit mode, plus the notes', () => {
    const view = render(<PromoView data={REFERENCE_A} isEditMode />).container.innerHTML;
    // Reference case A leaves the image empty on purpose, so a skeleton line
    // follows the block — the markup itself is view's, character for
    // character, and comes first.
    expect(html(REFERENCE_A).startsWith(view)).toBe(true);
  });

  it('adds nothing at all once every slot is filled', () => {
    const complete: PromoData = { ...REFERENCE_A, image_url: '/pic.jpg/@@images/image/large' };
    expect(missing(complete)).toEqual([]);
    expect(warnings(complete)).toEqual([]);
    expect(html(complete)).toBe(
      render(<PromoView data={complete} isEditMode />).container.innerHTML,
    );
  });

  it('seeds nothing — there is no onChangeBlock call to make', () => {
    // derico-hero writes the mockup's copy at insert; ticket 03 Q5 ruled
    // that out for a generic block, so `edit` takes no writer prop and an
    // empty node stays empty however many times it renders.
    const onChangeBlock = () => {
      throw new Error('edit must not write to the document');
    };
    expect(() =>
      render(<PromoEdit {...({ data: {}, block: 'b1', onChangeBlock } as any)} />),
    ).not.toThrow();
    expect(html({})).toContain('<div class="promo has--align--center">');
  });
});

describe('the skeleton', () => {
  it('names every empty slot of a fresh promo, in sidebar order', () => {
    expect(missing({})).toEqual([
      'kicker',
      'title',
      'description',
      'image',
      'primary action',
      'secondary action',
    ]);
  });

  it('lives outside the block root, so rule 3 still holds', () => {
    const { container } = render(<PromoEdit data={{}} />);
    expect(container.querySelector('.promo')!.innerHTML).toBe('');
    expect(container.querySelector('.promo-incomplete')!.parentElement).toBe(container);
  });

  it('is not editable and not reachable by the block stylesheet', () => {
    // Every rule in ticket 11's sheet descends from `.promo`; these do not,
    // and contentEditable={false} keeps the author from typing into them.
    const { container } = render(<PromoEdit data={{}} />);
    for (const selector of ['.promo-incomplete']) {
      const node = container.querySelector(selector)!;
      expect(node.getAttribute('contenteditable')).toBe('false');
      expect(node.closest('.promo')).toBeNull();
    }
  });

  it('disappears slot by slot as the promo is filled in', () => {
    expect(missing({ ...REFERENCE_A })).toEqual(['image']);
    expect(missing({ ...REFERENCE_A, image_url: '/p' })).toEqual([]);
  });

  it('counts a half-filled action as present, not missing', () => {
    // It is not an empty slot — it is a mistake, so it belongs in the
    // notices, where the sentence can say what is wrong with it.
    expect(missing({ cta_primary_label: 'Los' })).not.toContain('primary action');
    expect(warnings({ cta_primary_label: 'Los' })).toHaveLength(1);
  });
});

describe('the notices', () => {
  it.each([
    [
      'a label with no link',
      { cta_primary_label: 'Los' },
      /primary action has a label but no link/,
    ],
    [
      'a link with no label',
      { cta_secondary_link: '/x' },
      /secondary action has a link but no label/,
    ],
    [
      'a link that fails the screen',
      { cta_primary_label: 'Los', cta_primary_link: 'javascript:alert(1)' },
      /is not a kind of link this block follows/,
    ],
    [
      'a card link the labels have orphaned',
      { card_link: '/x', cta_primary_label: 'Los', cta_primary_link: '/y' },
      /card link is ignored while either action has a label/,
    ],
    [
      'a card link that fails the screen',
      { card_link: 'javascript:alert(1)' },
      /card link .* is not a kind of link/,
    ],
    [
      'an align with no image left to place',
      { align: 'left' },
      /no image to place/,
    ],
    [
      'an image value that is not a picture',
      { image: 'mailto:md@derico.de' },
      /is not a kind of picture this block can show/,
    ],
  ] as Array<[string, PromoData, RegExp]>)('announce %s', (_name, data, expected) => {
    expect(warnings(data).join('\n')).toMatch(expected);
    expect(html(data)).toMatch(/class="promo-notice"/);
  });

  it('say nothing about a dangling image reference', () => {
    // Indistinguishable from an image picked one second ago on this surface
    // (see imageSrc), so claiming it would mean crying wolf on the common
    // case. The preview is optimistic and self-corrects on the next load.
    expect(warnings({ image: '../resolveuid/gone' })).toEqual([]);
  });

  it('stay quiet for an untouched promo — a blank slot is not a mistake', () => {
    expect(warnings({})).toEqual([]);
    expect(render(<PromoEdit data={{}} />).container.querySelector('.promo-notice')).toBeNull();
  });

  it('are one element each, outside the root and not editable', () => {
    const data: PromoData = { cta_primary_label: 'Los', align: 'left' };
    const { container } = render(<PromoEdit data={data} />);
    const notices = container.querySelectorAll('.promo-notice');
    expect(notices).toHaveLength(warnings(data).length);
    notices.forEach((notice) => {
      expect(notice.getAttribute('contenteditable')).toBe('false');
      expect(notice.closest('.promo')).toBeNull();
    });
  });
});
