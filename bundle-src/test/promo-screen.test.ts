/**
 * Ticket 03 Q7: one allowlist, spelled twice.
 *
 * `path_of()` cannot screen these — `urlparse("mailto:…").path` is truthy, so
 * it strips the scheme and hands back a bare address. And an allowlist, not a
 * blocklist: all three link fields are author-typed free text, and a blocklist
 * fails open on the scheme nobody thought of.
 *
 * LOCKSTEP, and where it lives: the tables are duplicated in the server half
 * (ticket 09), so they are extended together or not at all. The Python suite
 * owns the lockstep assertion — `TestScreenParity` reads the two exported
 * arrays out of `src/promo/data.ts` and compares them to its own — because
 * Python arrives second and reading TS from Python is the cheaper direction.
 * What this file owns is the BEHAVIOUR of the JS spelling.
 */
import { describe, expect, it } from 'vitest';

import {
  IMAGE_SCHEMES,
  LINK_SCHEMES,
  screenImage,
  screenLink,
} from '../src/promo/data';

describe('the tables', () => {
  it('are the four link schemes and the two image schemes', () => {
    expect([...LINK_SCHEMES]).toEqual(['http', 'https', 'mailto', 'tel']);
    // mailto: and tel: are meaningless as an <img src>.
    expect([...IMAGE_SCHEMES]).toEqual(['http', 'https']);
  });
});

describe('screenLink', () => {
  it.each([
    ['/kontakt', 'a site-relative path'],
    ['../resolveuid/8f2c1a9e', 'the shape promo_link stores for a picked item'],
    ['https://plone.org', 'https'],
    ['http://plone.org', 'http'],
    ['mailto:md@derico.de', 'the scheme path_of() would mangle'],
    ['tel:+491234', 'tel'],
    ['MAILTO:md@derico.de', 'an upper-case scheme'],
  ])('passes %s (%s)', (value) => {
    expect(screenLink(value)).toBe(value.trim());
  });

  it.each([
    ['javascript:alert(1)', 'the reason this is an allowlist'],
    ['data:text/html,<script>', 'a data URL'],
    ['vbscript:x', 'a scheme nobody thought of'],
    ['//evil.example/x', 'a protocol-relative URL wearing a path’s clothes'],
    ['', 'nothing'],
    ['   ', 'whitespace'],
  ])('rejects %s (%s)', (value) => {
    expect(screenLink(value)).toBe('');
  });

  it('rejects a non-string without throwing — nothing is required', () => {
    for (const value of [null, undefined, 42, {}, []]) {
      expect(screenLink(value)).toBe('');
    }
  });

  it('trims, so a pasted value with a trailing newline still resolves', () => {
    expect(screenLink('  /kontakt\n')).toBe('/kontakt');
  });
});

describe('screenImage', () => {
  it('passes relative, http and https', () => {
    for (const value of ['/pic.jpg', '../resolveuid/abc', 'https://x/p.png']) {
      expect(screenImage(value)).toBe(value);
    }
  });

  it('rejects mailto: and tel: — meaningless as an <img src>', () => {
    expect(screenImage('mailto:md@derico.de')).toBe('');
    expect(screenImage('tel:+491234')).toBe('');
  });

  it('rejects javascript: and data:', () => {
    expect(screenImage('javascript:alert(1)')).toBe('');
    expect(screenImage('data:image/svg+xml,<svg/>')).toBe('');
  });
});
