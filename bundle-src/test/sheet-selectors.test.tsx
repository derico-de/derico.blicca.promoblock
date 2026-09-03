/**
 * Every selector in the sheet matches something the renderers actually emit.
 *
 * This is the half of ticket 04's "verify the defaults" duty that a headless
 * suite can carry, and it is the one that catches the failure this ticket is
 * most exposed to. The stylesheet and the two renderers agree by NAME only —
 * there is no compiler between `promo-copy` in `PromoView.tsx` and
 * `.promo-copy` in `styles.css`, and ticket 17 renamed `promo-content` to
 * `promo-copy` late. A stale or misspelled selector fails silently: the block
 * renders, the rule never applies, and nothing goes red.
 *
 * jsdom does no layout and does not resolve custom properties, so this suite
 * deliberately asserts REACHABILITY, not computed values. The values are held
 * by `seam-lockstep.test.ts` against the published table, and looked at on a
 * running site.
 *
 * It runs against the UNSUBSTITUTED upstream registry (ticket 02), so the
 * corpus is the Aurora-proper markup — which is the surface this sheet cannot
 * reach in that host anyway, and therefore the one whose class names nothing
 * else would check.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import postcss from 'postcss';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import PromoEdit from '../src/promo/PromoEdit';
import PromoView from '../src/promo/PromoView';
import type { PromoData } from '../src/promo/data';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const SHEET = readFileSync(
  path.join(PACKAGE_ROOT, 'bundle-src', 'src', 'styles.css'),
  'utf8',
);
const CASES: { name: string; data: PromoData }[] = JSON.parse(
  readFileSync(path.join(PACKAGE_ROOT, 'tests', 'anatomy-cases.json'), 'utf8'),
).cases;

/**
 * The fixture is 23 `center` cases and one `left`. `right` reverses the grid
 * template and re-places both children, which is three selectors the fixture
 * corpus cannot reach — and a promo with a card link and a title is what the
 * hover affordance hangs off. Written here rather than added to the fixture:
 * `tests/anatomy-cases.json` is the CROSS-RENDERER contract, and these exist
 * only to give this sheet's selectors something to match.
 */
const SYNTHETIC: { name: string; data: PromoData }[] = [
  {
    name: 'image-right',
    data: {
      image: 'https://example.com/promo.jpg',
      align: 'right',
      title: 'Beside the copy, mirrored',
      description: 'The placement `right` reverses the two grid tracks.',
    },
  },
  {
    name: 'card-link-with-a-title',
    data: {
      card_link: 'https://example.com/target',
      title: 'The whole card is the click target',
      head_title: 'Kicker',
    },
  },
];

/** One document holding every state, so a selector may match in any of them. */
function corpus(): HTMLElement {
  const root = document.createElement('div');
  for (const { data } of [...CASES, ...SYNTHETIC]) {
    // Both surfaces: `view` is the public page and the Aurora rendering,
    // `edit` adds the canvas chrome the sheet also dresses.
    root.append(render(<PromoView data={data} />).container);
    root.append(render(<PromoEdit data={data} />).container);
  }
  return root;
}

/**
 * `:hover` cannot be produced in jsdom, so it is removed before matching —
 * and the removal is ALLOWLISTED, so a selector reaching for a pseudo nobody
 * has thought about fails here instead of passing untested.
 */
const STRIPPABLE = /:hover\b/g;
const REMAINING_PSEUDO = /::?[a-z-]+/gi;

function selectors(css: string): string[] {
  const found: string[] = [];
  // A block body, not an expression: walkRules reads a returned value as
  // "stop walking", and `push` returns a number.
  postcss.parse(css).walkRules((rule) => {
    found.push(...rule.selectors);
  });
  return [...new Set(found)];
}

const ALL = selectors(SHEET);

describe('the sheet can reach the markup', () => {
  it('found the sheet and its rules', () => {
    // The control: every assertion below is vacuous against an empty parse.
    expect(ALL.length).toBeGreaterThan(15);
    expect(ALL).toContain('.promo');
  });

  it('uses no pseudo-class beyond the allowlisted :hover', () => {
    const exotic = ALL.filter((selector) =>
      selector.replace(STRIPPABLE, '').match(REMAINING_PSEUDO),
    );
    expect(exotic).toEqual([]);
  });

  it('has no selector that matches nothing either renderer emits', () => {
    const document_ = corpus();
    const dead = ALL.filter(
      (selector) => !document_.querySelector(selector.replace(STRIPPABLE, '')),
    );
    expect(dead).toEqual([]);
  });
});
