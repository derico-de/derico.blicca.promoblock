/**
 * Ticket 06's own tests: the workspace stands up, the loader convention is
 * honoured, and the upstream fixture is genuinely Blicca-free.
 *
 * Tickets 07, 08 and 15 add the behavioural suites. What is asserted here
 * is the scaffolding those suites rest on.
 */
import { describe, expect, it } from 'vitest';
import config from '@plone/registry';
import { getStyleFieldDefinitionsFromRegistry } from '@plone/helpers';

import install, { PromoBlockInfo } from '../src/index';
import {
  BLICCA_ONLY_REGISTRATIONS,
  UpstreamAlignWidget,
  UPSTREAM_WIDTHS,
  UpstreamImageWidget,
  choicesWidgetOf,
  installUpstreamRegistry,
} from './upstream-registry';

// A vitest file gets its own module registry, so this singleton is this
// file's alone.
const upstream = installUpstreamRegistry(config as any);

describe('install()', () => {
  it('returns the config — the loader convention requires it', () => {
    expect(install(upstream)).toBe(upstream);
  });

  it('registers the block under @type promo', () => {
    install(upstream);
    expect(upstream.blocks.blocksConfig.promo).toBe(PromoBlockInfo);
  });
});

describe('the blocksConfig entry', () => {
  it('has the two fields whose absence silently drops it from the slash menu', () => {
    expect(PromoBlockInfo.id).toBe('promo');
    expect(PromoBlockInfo.title).toBe('Promo');
  });

  it('carries id as a plain string, matching the stored @type', () => {
    expect(typeof PromoBlockInfo.title).toBe('string');
  });

  it('gives icon as a component — a string breaks the slash menu', () => {
    expect(typeof PromoBlockInfo.icon).toBe('function');
  });

  it('declares no defaultBlockWidth: the schema offers blockWidth instead', () => {
    expect(PromoBlockInfo).not.toHaveProperty('defaultBlockWidth');
  });
});

describe('the upstream registry fixture', () => {
  it('resolves widgets across all categories flat, as the host does', () => {
    expect(upstream.getWidget('align')).toBe(UpstreamAlignWidget);
    expect(upstream.getWidget('image')).toBe(UpstreamImageWidget);
    // registered under `vocabulary`, not `widget` — found anyway
    expect(upstream.getWidget('plone.app.vocabularies.Catalog')).toBeDefined();
  });

  it('registers no `choices` widget — it is Blicca-only', () => {
    // Via `choicesWidgetOf`: `getWidget('choices')` is blind to the way this
    // widget is registered and returns undefined either way (ticket 15).
    expect(BLICCA_ONLY_REGISTRATIONS.widgetKeys).toEqual(['choices']);
    expect(choicesWidgetOf(upstream)).toBeUndefined();
  });

  it('registers blockWidth and only blockWidth as a style field', () => {
    // The real signature takes `args` as a REQUIRED second parameter —
    // fragmentsblock's stub made it optional, which is the kind of drift a
    // hand-written facade hides until the host disagrees at runtime.
    expect(
      getStyleFieldDefinitionsFromRegistry('blockWidth', {
        data: {},
        fieldName: 'blockWidth',
        blockType: 'promo',
      }),
    ).toEqual(UPSTREAM_WIDTHS);
    for (const name of BLICCA_ONLY_REGISTRATIONS.styleFieldDefinitions) {
      expect(
        upstream.getUtility({ type: 'styleFieldDefinition', name }).method,
      ).toBeUndefined();
    }
  });
});
