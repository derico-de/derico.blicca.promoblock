/**
 * The `edit` half: the canvas is the public rendering plus honesty, and
 * nothing else.
 *
 * Two claims, and they fail for different reasons:
 *
 *  1. **It delegates.** `edit` renders `view` — so the anatomy cannot drift
 *     between the surfaces, and the block has one markup implementation on
 *     this side rather than two.
 *  2. **It is honest.** Every Q8 row that silently discards something the
 *     author typed is announced HERE — which is the reason those rows are
 *     allowed to be silent on the public page. An empty slot is NOT a
 *     mistake and gets no nag: the sidebar already shows what is blank.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import PromoEdit from '../src/promo/PromoEdit';
import PromoView from '../src/promo/PromoView';
import { imageSrc, warnings, type PromoData } from '../src/promo/data';

const html = (data: PromoData) => render(<PromoEdit data={data} />).container.innerHTML;

/** A picture as the server serves one: reference, provenance stamp, url. */
const SERVED = {
  image: '../resolveuid/8f2c1a9e',
  image_ref: '../resolveuid/8f2c1a9e',
  image_url: '/pic.jpg/@@images/image/large',
} as const;

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
    // Reference case A is clean, so nothing follows the block — the markup
    // is view's, character for character.
    expect(html(REFERENCE_A).startsWith(view)).toBe(true);
  });

  it('adds nothing at all once every slot is filled', () => {
    const complete: PromoData = { ...REFERENCE_A, ...SERVED };
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

describe('an empty promo', () => {
  it('gets no chrome at all — the canvas never nags about blank slots', () => {
    const { container } = render(<PromoEdit data={{}} />);
    expect(container.querySelector('.promo')!.innerHTML).toBe('');
    expect(container.querySelectorAll('p').length).toBe(0);
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

  it('say nothing about an UNSTAMPED image reference', () => {
    // Indistinguishable from an image picked one second ago on this surface
    // (see imageSrc), so claiming it would mean crying wolf on the common
    // case. The preview is optimistic and self-corrects on the next load.
    expect(warnings({ image: '../resolveuid/gone' })).toEqual([]);
  });

  it('announce a dangling reference once the server has confirmed it', () => {
    // ADR 0003: the stamp is emitted even where nothing resolved, so *stamp
    // present, image_url absent* is the server saying it looked at this exact
    // reference and got nothing. Now a fact, so now sayable.
    const data: PromoData = {
      image: '../resolveuid/gone',
      image_ref: '../resolveuid/gone',
    };
    expect(warnings(data).join('\n')).toMatch(/no longer exists/);
    expect(html(data)).toMatch(/class="promo-notice"/);
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

describe('the picture the canvas shows, ADR 0003', () => {
  it('follows a replacement immediately, without waiting for a reload', () => {
    // The load-time derived set describes the OLD picture and says so, so it
    // is discarded whole and the new reference previews through rung 2.
    const replaced: PromoData = { ...SERVED, image: '../resolveuid/replacement' };
    expect(imageSrc(replaced)).toBe('../resolveuid/replacement/@@images/image/large');
    expect(html(replaced)).toContain('../resolveuid/replacement/@@images/image/large');
    expect(html(replaced)).not.toContain('/pic.jpg/@@images/image/large');
  });

  it('reflows to the no-image layout when the picture is confirmed gone', () => {
    // Both surfaces now agree on this node, which is what let the parity claim
    // drop its stated exception: no <picture>, and the placement snaps to
    // centred because there is nothing left to place.
    const gone: PromoData = { title: 'Plone', align: 'left', image: '../resolveuid/gone', image_ref: '../resolveuid/gone' };
    expect(html(gone)).toContain('<div class="promo has--align--center">');
    expect(html(gone)).not.toContain('promo-image');
  });

  it('achieves both without ever writing to the document', () => {
    // The whole reason ADR 0003 chose provenance over letting `edit` clear the
    // stale keys: freshness bought with a writer would cost the no-writer rule
    // its meaning, and this is the test that rule is pinned by.
    const onChangeBlock = () => {
      throw new Error('edit must not write to the document');
    };
    for (const data of [
      { ...SERVED, image: '../resolveuid/replacement' },
      { image: '../resolveuid/gone', image_ref: '../resolveuid/gone' },
    ]) {
      expect(() =>
        render(<PromoEdit {...({ data, block: 'b1', onChangeBlock } as any)} />),
      ).not.toThrow();
    }
  });
});
