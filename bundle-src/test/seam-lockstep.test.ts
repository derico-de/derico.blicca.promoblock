/**
 * The README ↔ stylesheet lockstep.
 *
 * This test is LOAD-BEARING, not hygiene. Ticket 04 and ADR 0002 put the
 * block's nineteen seam defaults at their POINT OF USE — every axis is spelled
 * `var(--promo-x, <literal>)` and the sheet declares no `--promo-*` property
 * anywhere — so there is no single place in the code that states what a default
 * is. The README's property table is that place, and it is published: ticket
 * 04's growth policy makes CHANGING a default a breaking change. Nothing else
 * keeps the two in step.
 *
 * It therefore fails in five directions, not one:
 *
 *   1. a documented property that no rule consumes (a table row that lies);
 *   2. a use whose fallback differs from the documented default (drift, and a
 *      silent breaking change);
 *   3. a use with no fallback at all (the axis stops working on a bare host);
 *   4. a `--promo-*` the sheet consumes and the README does not document (an
 *      unpublished seam, which themes cannot discover);
 *   5. a `--promo-*` DECLARED in the sheet — the tidy-up ADR 0002 exists to
 *      stop, because declaring a property on `.promo` shadows a theme's
 *      inherited value.
 *
 * It reads the SOURCE stylesheet rather than the built asset: the scope wrap
 * moves selectors around and this test is about values, and a source-only
 * failure is the one a developer can act on.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const README = readFileSync(path.join(PACKAGE_ROOT, 'README.md'), 'utf8');
const SHEET_PATH = path.join(PACKAGE_ROOT, 'bundle-src', 'src', 'styles.css');
const SHEET = readFileSync(SHEET_PATH, 'utf8');

/**
 * Whitespace is not meaning in CSS values, and neither file can be held to the
 * other's line breaks: the README states each default on one table row, while
 * the sheet wraps a long `color-mix()` across several lines to stay readable.
 * Collapsing runs of whitespace AND the padding just inside a function's parens
 * is the whole of the equivalence — nothing else about the value is relaxed, so
 * a changed colour, unit or percentage still fails.
 */
function normalise(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

/**
 * Comments must go before anything is scanned: the sheet's own header explains
 * the mechanism using a literal `var(--promo-x, <literal>)`, which is prose and
 * not a use site.
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

type VarUse = { name: string; fallback: string | null };

/**
 * Every `var()` in the sheet, including the ones NESTED inside another var()'s
 * fallback — `--promo-cta-hover-bg`'s documented default contains
 * `var(--promo-cta-bg, CanvasText)`, and that inner use has to be held to the
 * table too. A regex cannot do this: the fallback is paren-balanced.
 */
function parseVarUses(css: string): VarUse[] {
  const uses: VarUse[] = [];
  for (let i = css.indexOf('var('); i !== -1; i = css.indexOf('var(', i + 1)) {
    let j = i + 'var('.length;
    let name = '';
    while (j < css.length && css[j] !== ',' && css[j] !== ')') name += css[j++];
    if (j >= css.length) break;
    if (css[j] === ')') {
      uses.push({ name: name.trim(), fallback: null });
      continue;
    }
    let depth = 0;
    let fallback = '';
    j += 1;
    for (; j < css.length; j++) {
      const c = css[j];
      if (c === '(') depth++;
      else if (c === ')') {
        if (depth === 0) break;
        depth--;
      }
      fallback += c;
    }
    uses.push({ name: name.trim(), fallback: fallback.trim() });
  }
  return uses;
}

/** `| `--promo-gap` | `2rem` | image column ↔ copy column |` */
function parseReadmeTable(markdown: string): Map<string, string> {
  const documented = new Map<string, string>();
  const row = /^\|\s*`(--promo-[\w-]+)`\s*\|\s*`(.+?)`\s*\|/gm;
  for (const match of markdown.matchAll(row)) {
    documented.set(match[1], normalise(match[2]));
  }
  return documented;
}

const documented = parseReadmeTable(README);
const body = stripComments(SHEET);
const promoUses = parseVarUses(body).filter((use) =>
  use.name.startsWith('--promo-'),
);

describe('the seam is what the README says it is', () => {
  // The controls. Every assertion below is vacuously true against an empty
  // parse, and both parsers are hand-written — so prove they found something
  // before trusting what they did not find.
  it('parses the published table', () => {
    expect(documented.size).toBe(19);
    expect(documented.get('--promo-gap')).toBe('2rem');
    expect(documented.get('--promo-cta-hover-bg')).toBe(
      'color-mix(in oklab, var(--promo-cta-bg, CanvasText) 88%, var(--promo-cta-fg, Canvas))',
    );
  });

  it('parses the stylesheet, nested fallbacks and all', () => {
    expect(promoUses.length).toBeGreaterThanOrEqual(documented.size);
    // The nested use inside --promo-cta-hover-bg's own default.
    expect(
      promoUses.filter((use) => use.name === '--promo-cta-bg').length,
    ).toBeGreaterThan(1);
  });

  it('consumes every property it publishes', () => {
    const used = new Set(promoUses.map((use) => use.name));
    const unused = [...documented.keys()].filter((name) => !used.has(name));
    expect(unused).toEqual([]);
  });

  it('publishes every property it consumes', () => {
    const undocumented = [
      ...new Set(promoUses.map((use) => use.name)),
    ].filter((name) => !documented.has(name));
    expect(undocumented).toEqual([]);
  });

  it('spells every use with exactly the documented default', () => {
    const drift = promoUses
      .filter((use) => documented.has(use.name))
      .filter((use) => normalise(use.fallback ?? '') !== documented.get(use.name))
      .map((use) => `${use.name}: ${use.fallback ?? '(no fallback)'}`);
    expect(drift).toEqual([]);
  });

  it('declares no --promo-* property anywhere (ADR 0002)', () => {
    const declarations = [
      ...body.matchAll(/(?:^|[;{\s])(--promo-[\w-]+)\s*:/g),
    ].map((match) => match[1]);
    expect(declarations).toEqual([]);
  });
});

describe('the sanity rules the sheet is written under', () => {
  it('uses no !important', () => {
    expect(body).not.toMatch(/!\s*important/);
  });

  it('never selects on [href]', () => {
    // The canvas drops every href and keeps every element, tag and class, so
    // [href] is the one selector that can tell the two surfaces apart.
    expect(body).not.toMatch(/\[href/);
  });

  it('sets no outline, so the host focus ring reaches the CTA', () => {
    expect(body).not.toMatch(/(?:^|[;{\s])outline\s*:/);
  });
});
