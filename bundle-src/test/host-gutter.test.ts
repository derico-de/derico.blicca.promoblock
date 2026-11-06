/**
 * The host pads a full-width add-on block by `--aurora-addon-gutter` on its
 * wrapper. The promo takes that gutter back, so its picture runs to the
 * window's edge, and keeps its copy off the edge by `--aurora-bleed-gutter`.
 */
import postcss from 'postcss';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SHEET = readFileSync(
  path.resolve(import.meta.dirname, '..', 'src', 'styles.css'),
  'utf8',
);

function declarations(prop: string): { selector: string; value: string }[] {
  const found: { selector: string; value: string }[] = [];
  postcss.parse(SHEET).walkDecls(prop, (decl) => {
    found.push({ selector: (decl.parent as postcss.Rule).selector, value: decl.value });
  });
  return found;
}

describe('the host gutter at full width', () => {
  it('is taken back on the wrapper', () => {
    expect(declarations('--aurora-addon-gutter')).toEqual([
      { selector: '.block-promo', value: '0px' },
    ]);
  });

  it('keeps the copy off the edge', () => {
    const copy = declarations('padding-inline').filter(({ selector }) =>
      selector.includes('.block-promo.has--block-width--full'),
    );
    expect(copy.map(({ value }) => value)).toContain('var(--aurora-bleed-gutter, 0px)');
  });
});
