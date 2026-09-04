/**
 * The anatomy: ticket 17's class table and ticket 03's Q8 table, held against
 * the React renderer.
 *
 * This is the suite ticket 09 must match, so it is written twice over on
 * purpose:
 *
 *  - **against a shared fixture** (`tests/anatomy-cases.json`), hand-authored
 *    from ticket 17's table, which the Chameleon template's Python suite reads
 *    too. The cross-renderer contract is the fixture's SKELETON — the markup
 *    with every attribute but `class` removed — so ticket 09 can emit a real
 *    resolution ladder in its `<img>` and still be held to the same anatomy.
 *  - **as structural assertions** below, written from the table by hand, so a
 *    fixture regenerated from the code could not quietly redefine the table.
 *
 * Whitespace is load-bearing in the comparison: `pre-wrap` inside the Plate
 * editable turns an inter-element newline into a real line box, so the
 * expectation carries none and the template must strip its indentation.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import config from '@plone/registry';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import PromoView from '../src/promo/PromoView';
import { derivedAreCurrent, imageSrc, warnings, type PromoData } from '../src/promo/data';

/* ── the shared fixture ─────────────────────────────────────────────────── */

const FIXTURE = 'tests/anatomy-cases.json';

/**
 * Found by walking up from the working directory, not from `import.meta.url`:
 * Vitest serves test modules over its own dev server, so `import.meta.url` is
 * an http URL here and `new URL(…)` against it is not a path at all.
 */
function fixtureFile(): string {
  let directory = process.cwd();
  for (let up = 0; up < 4; up += 1) {
    const candidate = join(directory, FIXTURE);
    if (existsSync(candidate)) return candidate;
    directory = dirname(directory);
  }
  throw new Error(`no ${FIXTURE} above ${process.cwd()}`);
}

type Case = {
  name: string;
  note: string;
  data: PromoData;
  html: string;
  reactOnly?: { why: string; html: string };
};

const CASES: Case[] = JSON.parse(readFileSync(fixtureFile(), 'utf8')).cases;

const TAG = /<([a-z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*(\/?)>/gi;

const attributesOf = (attrs: string): string[] =>
  attrs.match(/[^\s=]+(?:="[^"]*")?/g) ?? [];

/**
 * Attribute ORDER, normalized away.
 *
 * React deliberately writes `src` last on an `<img>` so the browser has the
 * other attributes before it starts fetching, and that is a React
 * implementation detail — not something a fixture shared with a Chameleon
 * template should encode. Sorting both sides keeps the exact comparison
 * (text, nesting, element order, attribute VALUES) while leaving order out
 * of it.
 */
function canonical(html: string): string {
  return html.replace(TAG, (_match, tag: string, attrs: string, close: string) => {
    const sorted = attributesOf(attrs).sort();
    return `<${tag}${sorted.length ? ` ${sorted.join(' ')}` : ''}${close}>`;
  });
}

/**
 * The cross-renderer contract, spelled once: keep tags, keep `class`, keep
 * text, drop every other attribute. Ticket 09's Python suite implements the
 * same rule against the same fixture, which is what lets its `<img>` carry a
 * real resolution ladder while still being held to this anatomy.
 */
export function skeleton(html: string): string {
  return html.replace(TAG, (_match, tag: string, attrs: string, close: string) => {
    const kept = attributesOf(attrs).filter((attr) => attr.startsWith('class='));
    return `<${tag}${kept.length ? ` ${kept.join(' ')}` : ''}${close}>`;
  });
}

const markup = (data: PromoData, isEditMode?: boolean) =>
  render(<PromoView data={data} isEditMode={isEditMode} />).container.innerHTML;

describe('the shared anatomy fixture', () => {
  it('covers the states ticket 17 and ticket 03 Q8 enumerate', () => {
    // A floor, not a total: the point is that a case DELETED from the fixture
    // is noticed, since deleting one is how a renderer stops being held to a
    // row of the table.
    expect(CASES.length).toBeGreaterThanOrEqual(26);
    expect(new Set(CASES.map((entry) => entry.name)).size).toBe(CASES.length);
    for (const entry of CASES) expect(entry.note, entry.name).toBeTruthy();
  });

  it.each(CASES.map((entry) => [entry.name, entry] as const))(
    'renders %s exactly',
    (_name, entry) => {
      expect(canonical(markup(entry.data))).toBe(
        canonical(entry.reactOnly?.html ?? entry.html),
      );
    },
  );

  it.each(CASES.map((entry) => [entry.name, entry] as const))(
    'matches the cross-renderer skeleton for %s',
    (_name, entry) => {
      // The one legitimate divergence carries its own reason in the fixture.
      const expected = entry.reactOnly?.html ?? entry.html;
      expect(skeleton(markup(entry.data))).toBe(skeleton(expected));
      if (entry.reactOnly) expect(entry.reactOnly.why).toBeTruthy();
    },
  );

  it('drops every href on the editor surface, and changes nothing else', () => {
    // Ticket 08's canvas-safety rule. A live href on the card-link wrapper
    // makes the whole block a navigation target, so the author cannot click
    // to select what they are editing; on an action it throws away unsaved
    // work. The element, its tag and its classes are untouched — which is
    // why ticket 11's sheet must never select on [href].
    for (const entry of CASES) {
      const expected = (entry.reactOnly?.html ?? entry.html).replace(
        / href="[^"]*"/g,
        '',
      );
      expect(canonical(markup(entry.data, true)), entry.name).toBe(canonical(expected));
    }
  });
});

/* ── the table, restated by hand ────────────────────────────────────────── */

const promo = (data: PromoData) =>
  render(<PromoView data={data} />).container.querySelector('.promo')!;

/**
 * A picture as the server actually serves one: the stored reference, the
 * provenance stamp naming it, and the URL it resolved to (ADR 0003). Anything
 * less is a node no serializer emits — `image_url` alone is now ignored, which
 * is the whole point of the stamp — so every "has an image" case below is
 * spelled with all three rather than with the derived key on its own.
 */
const SERVED = {
  image: '../resolveuid/8f2c1a9e',
  image_ref: '../resolveuid/8f2c1a9e',
  image_url: '/pic.jpg/@@images/image/large',
} as const;

const FULL: PromoData = {
  head_title: 'Kontakt',
  title: 'Erstgespräch vereinbaren',
  description: 'Ein Satz.',
  ...SERVED,
  align: 'left',
  cta_primary_label: 'Termin',
  cta_primary_link: '/kontakt',
  cta_secondary_label: 'md@derico.de',
  cta_secondary_link: 'mailto:md@derico.de',
  cta_secondary_variant: 'link',
};

describe('the root', () => {
  it('is our own div.promo, never the host wrapper stamp', () => {
    const root = promo(FULL);
    expect(root.tagName).toBe('DIV');
    // The host stamps these on the wrapper OUTSIDE our root; emitting them
    // ourselves would double them.
    for (const owned of ['block', 'block-promo']) {
      expect(root.classList.contains(owned)).toBe(false);
    }
    expect([...root.classList].some((name) => name.startsWith('has--block-width--'))).toBe(false);
    expect([...root.classList].some((name) => name.startsWith('has--backgroundColor--'))).toBe(false);
  });

  it('keeps its tag and class list invariant when a card link appears', () => {
    // Ticket 17 rule 4: the wrapper is why. A root whose tag went conditional
    // would force both renderers to agree on a branch at the single element
    // the whole stylesheet hangs off.
    const plain = promo({ title: 'Plone' });
    const wrapped = promo({ title: 'Plone', card_link: '/x' });
    expect(wrapped.tagName).toBe(plain.tagName);
    expect(wrapped.className).toBe(plain.className);
    expect(wrapped.parentElement?.className).toBe('promo-cardlink');
    expect(plain.parentElement?.className).not.toBe('promo-cardlink');
  });

  it('emits has--align-- always, with the effective placement', () => {
    for (const [data, expected] of [
      [{}, 'center'],
      [{ align: 'left' }, 'center'],
      [{ ...SERVED }, 'center'],
      [{ ...SERVED, align: 'left' }, 'left'],
      [{ ...SERVED, align: 'right' }, 'right'],
      [{ ...SERVED, align: 'center' }, 'center'],
    ] as Array<[PromoData, string]>) {
      expect(promo(data).classList.contains(`has--align--${expected}`)).toBe(true);
      expect([...promo(data).classList].filter((name) => name.startsWith('has--align--'))).toHaveLength(1);
    }
  });

  it('emits no image-presence class — rule 2 says none is needed', () => {
    const withImage = [...promo({ ...SERVED }).classList];
    const without = [...promo({}).classList];
    expect(withImage).toEqual(without);
  });
});

describe('the elements', () => {
  it('are exactly the twelve classes of the table, and no others', () => {
    const { container } = render(<PromoView data={{ ...FULL, card_link: undefined }} />);
    const emitted = new Set<string>();
    container.querySelectorAll('*').forEach((element) => {
      element.classList.forEach((name) => emitted.add(name));
    });
    expect([...emitted].sort()).toEqual([
      'has--align--left',
      'promo',
      'promo-actions',
      'promo-copy',
      'promo-cta',
      'promo-cta-button',
      'promo-cta-link',
      'promo-description',
      'promo-image',
      'promo-kicker',
      'promo-title',
    ]);
  });

  it('carry the tags ticket 17 chose, and its reasons', () => {
    const { container } = render(<PromoView data={FULL} />);
    // <div>, not <section>: a nameless region in the accessibility tree, four
    // times over on a page of promos, is worse than none.
    expect(container.querySelector('.promo')!.tagName).toBe('DIV');
    expect(container.querySelector('section')).toBeNull();
    // <h2>: a promo that never enters the document outline is invisible to
    // anyone navigating by heading, and the block cannot know its true level.
    expect(container.querySelector('.promo-title')!.tagName).toBe('H2');
    expect(container.querySelector('.promo-kicker')!.tagName).toBe('P');
    expect(container.querySelector('.promo-description')!.tagName).toBe('P');
    expect(container.querySelector('.promo-image')!.tagName).toBe('PICTURE');
    expect(container.querySelector('.promo-image > img')).not.toBeNull();
  });

  it('never emit a heading, a container or an anchor with nothing in it', () => {
    // Ticket 17 rule 3, generalized: no empty element anywhere, so there is
    // no empty-heading hazard and no container for the sheet to space out
    // around nothing.
    const { container } = render(<PromoView data={{}} />);
    expect(container.innerHTML).toBe('<div class="promo has--align--center"></div>');
    for (const data of [{ title: 'x' }, { ...SERVED }, { card_link: '/x' }]) {
      const rendered = render(<PromoView data={data} />).container;
      rendered.querySelectorAll('div, p, h2, a, picture').forEach((element) => {
        if (element.classList.contains('promo')) return;
        expect(element.childNodes.length, element.outerHTML).toBeGreaterThan(0);
      });
    }
  });

  it('mark the picture decorative — ticket 03 declared no alt field', () => {
    // The title and description carry the meaning; an alt invented from the
    // title would be read twice.
    const image = render(<PromoView data={FULL} />).container.querySelector('img')!;
    expect(image.getAttribute('alt')).toBe('');
  });
});

describe('the click rule, in all four label/link combinations', () => {
  const CARD = '/leistungen';
  const combinations: Array<[string, PromoData, 'cardlink' | 'actions' | 'neither']> = [
    ['no label, no card link', {}, 'neither'],
    ['no label, card link set', { card_link: CARD }, 'cardlink'],
    [
      'label and link, no card link',
      { cta_primary_label: 'Los', cta_primary_link: '/x' },
      'actions',
    ],
    [
      'label and link, card link also set',
      { cta_primary_label: 'Los', cta_primary_link: '/x', card_link: CARD },
      'actions',
    ],
    [
      'label without a link, card link set',
      { cta_primary_label: 'Los', card_link: CARD },
      'neither',
    ],
    [
      'link without a label, card link set',
      { cta_primary_link: '/x', card_link: CARD },
      'cardlink',
    ],
  ];

  it.each(combinations)('%s → %s', (_name, data, expected) => {
    const { container } = render(<PromoView data={{ title: 'Plone', ...data }} />);
    const wrapper = container.querySelector('.promo-cardlink');
    const actions = container.querySelectorAll('.promo-cta');
    expect(Boolean(wrapper)).toBe(expected === 'cardlink');
    expect(actions.length > 0).toBe(expected === 'actions');
  });

  it('never nests one interactive element inside another', () => {
    for (const [, data] of combinations) {
      const { container } = render(<PromoView data={{ title: 'Plone', ...data }} />);
      container.querySelectorAll('a').forEach((anchor) => {
        expect(anchor.querySelector('a'), anchor.outerHTML).toBeNull();
      });
    }
  });

  it('leaves a hidden card link on disk untouched, and brings it back', () => {
    // The field is only OFFERED while both labels are empty; a value set
    // earlier survives and returns when the labels clear.
    const stored = { title: 'Plone', card_link: '/leistungen' };
    expect(promo({ ...stored, cta_primary_label: 'Los' }).parentElement?.className).not.toBe(
      'promo-cardlink',
    );
    expect(promo(stored).parentElement?.className).toBe('promo-cardlink');
  });
});

describe('imageSrc, the canvas preview rule', () => {
  // Ticket 08 decided this; the fixture cases exercise steps 1 and 4, and
  // these cover the derivations no serialized node can reach.
  it('prefers a STAMPED image_url over the raw reference', () => {
    expect(
      imageSrc({
        image: '../resolveuid/abc',
        image_ref: '../resolveuid/abc',
        image_url: '/pic/@@images/image/x',
      }),
    ).toBe('/pic/@@images/image/x');
  });

  it('appends the preview scale to a resolveuid reference, and keeps it relative', () => {
    // Verified against plone.outputfilters' ResolveUIDView, which collects
    // its subpath and 301s to <target>/@@images/image/large; the view is
    // registered for="*", so the relative form resolves from any depth.
    expect(imageSrc({ image: '../resolveuid/abc' })).toBe(
      '../resolveuid/abc/@@images/image/large',
    );
  });

  it('appends it to a site-relative content path', () => {
    expect(imageSrc({ image: '/pic.jpg' })).toBe('/pic.jpg/@@images/image/large');
  });

  it('emits any other http(s) URL whole — @@images on an external picture 404s', () => {
    expect(imageSrc({ image: 'https://plone.org/logo.png' })).toBe(
      'https://plone.org/logo.png',
    );
  });

  it('reads the legacy object and array shapes the host widget also reads', () => {
    expect(imageSrc({ image: [{ '@id': '/pic.jpg' }] })).toBe('/pic.jpg/@@images/image/large');
    expect(imageSrc({ image: { '@id': '/pic.jpg' } })).toBe('/pic.jpg/@@images/image/large');
  });

  it('appends it to an absolute URL under config.settings.apiPath', () => {
    // The branch that makes a just-picked image preview in Aurora proper,
    // whose own image widget stores an absolute @id. `apiPath` is a
    // @plone/types Settings field, so it is the one host-provided value both
    // hosts are known to carry.
    const settings = (config as { settings: Record<string, unknown> }).settings;
    const original = settings.apiPath;
    settings.apiPath = 'http://localhost:8081/Plone';
    try {
      expect(imageSrc({ image: 'http://localhost:8081/Plone/pic.jpg' })).toBe(
        'http://localhost:8081/Plone/pic.jpg/@@images/image/large',
      );
      // Outside the site, so external: emitted whole.
      expect(imageSrc({ image: 'http://cdn.example/pic.jpg' })).toBe(
        'http://cdn.example/pic.jpg',
      );
    } finally {
      settings.apiPath = original;
    }
  });

  it('answers absent for everything unusable, without throwing', () => {
    for (const value of [undefined, null, '', '   ', 42, [], {}, 'mailto:x@y', 'javascript:x']) {
      expect(imageSrc({ image: value })).toBe('');
    }
  });
});

describe('the provenance stamp, ADR 0003', () => {
  const OLD = '../resolveuid/before';
  const NEW = '../resolveuid/after';

  it('trusts the derived set only while the stamp names the stored value', () => {
    expect(derivedAreCurrent({ image: OLD, image_ref: OLD })).toBe(true);
    expect(derivedAreCurrent({ image: NEW, image_ref: OLD })).toBe(false);
    // An unstamped node is every node the server has not served, and a stamped
    // one with no image is not a node at all.
    expect(derivedAreCurrent({ image: OLD })).toBe(false);
    expect(derivedAreCurrent({ image_ref: OLD })).toBe(false);
    expect(derivedAreCurrent({})).toBe(false);
  });

  it('normalizes both sides, so the legacy shapes still match their stamp', () => {
    // The stamp is `stored_image()`'s output on the server and is compared
    // against `storedImage()` here — the existing parity pair, not a third
    // spelling of the normalization.
    expect(derivedAreCurrent({ image: [{ '@id': '/pic.jpg' }], image_ref: '/pic.jpg' })).toBe(true);
    expect(derivedAreCurrent({ image: '  /pic.jpg  ', image_ref: '/pic.jpg' })).toBe(true);
  });

  it('previews the NEW picture the moment the author replaces one', () => {
    // The divergence that "looks fine and is wrong": before the stamp, the
    // load-time image_url won rung 1 and the canvas kept showing the picture
    // the author had just replaced.
    expect(
      imageSrc({ image: NEW, image_ref: OLD, image_url: '/before.jpg/@@images/image/large' }),
    ).toBe(`${NEW}/@@images/image/large`);
  });

  it('draws no picture at all for a stamped reference that resolved to nothing', () => {
    // *Stamp present, image_url absent* — the server looked at this exact
    // reference and got nothing. Byte-parity with its no-image layout, which
    // is the exception the parity claim used to state.
    expect(imageSrc({ image: OLD, image_ref: OLD })).toBe('');
  });

  it('still previews optimistically with no stamp at all', () => {
    // Rungs 2 to 4 are not weakened: a freshly picked image carries no derived
    // set, and that is the common case, not the broken one.
    expect(imageSrc({ image: OLD })).toBe(`${OLD}/@@images/image/large`);
  });

  it('screens a stamped image_url like any other', () => {
    for (const bad of ['javascript:alert(1)', 'mailto:x@y', '//evil.example/p.png']) {
      expect(imageSrc({ image: bad, image_ref: bad, image_url: bad })).toBe('');
    }
  });

  it('names a confirmed dead reference, and only a confirmed one', () => {
    const dead = warnings({ image: OLD, image_ref: OLD });
    expect(dead).toHaveLength(1);
    expect(dead[0]).toMatch(/no longer exists/);
    // The stored value is a resolveuid the author never typed and the picture
    // it named is gone, so there is nothing worth quoting (ticket 22, found on
    // the running site). The typo sentence below still quotes, and must.
    expect(dead[0]).not.toContain(OLD);
    // Unstamped: unknowable, so unsaid — the notice would otherwise fire on
    // every picture chosen in the last second.
    expect(warnings({ image: OLD })).toEqual([]);
    // Stamped but not a picture URL at all: the author's typo, which has its
    // own sentence and must not be reported as a deletion.
    expect(warnings({ image: 'javascript:x', image_ref: 'javascript:x' })).toEqual([
      '\u201cjavascript:x\u201d is not a kind of picture this block can show.',
    ]);
  });
});
