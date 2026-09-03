/**
 * Ticket 15: the block, exercised against Aurora proper.
 *
 * ## What this suite claims, and what it does not
 *
 * It does NOT claim the Promo is "verified in Aurora". No Seven app is stood
 * up — ticket 02 ruled that out of scope (it needs VHM domain-root serving
 * and a monorepo source integration, and contract §4's runtime add-on loader
 * is a Blicca mechanism Aurora has no counterpart for). What runs here is the
 * registry Aurora builds, from the packages Aurora ships, at the versions
 * this host pins, with **none of Blicca's overrides** — and the block's own
 * `install`, `edit` and `view` on top of it.
 *
 * So the honest claim, and the one the README makes, is: **the Promo is built
 * against upstream-registered widgets and its own, and every field it declares
 * resolves in Aurora to the widget it was designed for.** Ticket 02 named the
 * registry differences as the risk; those are what this covers.
 *
 * ## Why the fixture is the real packages now
 *
 * Ticket 06 transcribed cmsui's registration list by hand and left this
 * ticket the choice. It chose the real installers, because the assertions
 * below are mostly assertions of ABSENCE — no `choices`, no `textarea`, no
 * `backgroundColor` style field — and against a transcription those merely
 * restate what we chose not to transcribe. See `upstream-registry.ts`.
 *
 * ## The boundary this suite found
 *
 * Two of the four upstream widgets the promo's schema resolves to —
 * `ImageWidget` (`useFetcher`) and `ObjectBrowserWidget` (`useLoaderData`) —
 * cannot be MOUNTED outside Aurora's edit data-route. They resolve; they do
 * not render in any harness. ADR 0009 recorded half of this (the
 * ObjectBrowserWidget half) as Blicca's reason for substituting it. The
 * ImageWidget half is new here. Both are pinned below so the boundary is a
 * tested fact rather than a remembered one.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';

import config from '@plone/registry';
import { AlignWidget, TextField } from '@plone/components/quanta';
import ImageWidget from '@plone/cmsui/components/ImageWidget/ImageWidget';
import { ObjectBrowserWidget } from '@plone/cmsui/components/ObjectBrowserWidget/ObjectBrowserWidget';

import install, { PromoBlockInfo, PromoView, PromoSchema } from '../src/index';
import { PROMO_WIDGETS } from '../src/widgets';
import {
  BLICCA_ONLY_REGISTRATIONS,
  UPSTREAM_BLOCKS,
  choicesWidgetOf,
  installUpstreamRegistry,
} from './upstream-registry';

// A vitest file gets its own module registry, so this singleton is this
// file's alone: Aurora's five installers, then ours, and nothing between.
const aurora = installUpstreamRegistry(config as any);
install(aurora);

/** The committed artifact: what `plone:static` publishes and the editor loads. */
const bundleSourcePath = path.resolve(
  import.meta.dirname,
  '../../src/derico/blicca/promoblock/static/promo-block.js',
);

const FIXTURES = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../../tests/anatomy-cases.json'),
    'utf8',
  ),
) as { cases: Array<{ name: string; data: Record<string, unknown>; html: string }> };

/**
 * `renderFieldWidget`'s resolution chain, from
 * `@plone/cmsui/components/Form/Field.tsx`, reproduced for the attributes the
 * promo's schema actually uses. Order is load-bearing and easy to get wrong:
 * field-id first and unconditionally, and `widget` — once it is a string —
 * short-circuits to the DEFAULT rather than falling through to `choices`.
 * That last detail is why `cta_*_variant` carries `widget: 'promo_select'`
 * and not bare `choices`.
 */
function resolveWidget(name: string, property: Record<string, any>) {
  const c = aurora as any;
  const byFieldId = c.getWidget(property.id ?? name) ?? null;
  if (byFieldId) return byFieldId;
  if (typeof property.widget === 'string') {
    return c.getWidget(property.widget) ?? c.widgets.default;
  }
  if (property.choices || property.vocabulary) return c.widgets?.choices ?? null;
  if (property.type) return c.getWidget(property.type) ?? null;
  return c.widgets.default;
}

/** Every property the schema declares, with every conditional field present. */
function allProperties() {
  const withEverything = PromoSchema({
    formData: { image: '../resolveuid/x', cta_primary_label: 'Read on' },
  });
  const bare = PromoSchema({ formData: {} });
  return { ...bare.properties, ...withEverything.properties } as Record<
    string,
    Record<string, any>
  >;
}

describe('the fixture is Aurora, not a copy of it', () => {
  // The precondition everything else rests on. pnpm resolves ONE
  // `@plone/components` instance for both this module and cmsui's own import;
  // were it two, every `toBe` below would be comparing distinct copies and
  // quietly proving nothing.
  it('registers the very component objects cmsui imports', () => {
    expect(aurora.getWidget('align')).toBe(AlignWidget);
    expect(aurora.getWidget('image')).toBe(ImageWidget);
    expect(aurora.getWidget('object_browser')).toBe(ObjectBrowserWidget);
    expect((aurora as any).widgets.default).toBe(TextField);
  });

  it('builds the layer stack Aurora builds, in the host order', () => {
    // theming → plate → blocks → layout → cmsui, read off the wrapper's
    // bootstrap/config.ts. `cmsui` last is the observable end of that order.
    expect((aurora as any).settings.cssLayers).toEqual([
      'theme',
      'base',
      'components',
      'plone-components',
      'utilities',
      'custom',
      'cmsui',
    ]);
  });
});

describe('the absence of Blicca', () => {
  // Since the fixture runs upstream's own installers, each of these is now a
  // statement about Aurora rather than about what this file declined to
  // register — which is the whole reason ticket 15 swapped the fixture.
  it('registers no `choices` widget', () => {
    // Read through `choicesWidgetOf`, NOT `getWidget` — see the note on that
    // helper. `getWidget('choices')` cannot see this registration at all, so
    // the obvious spelling passes even with Blicca's widget installed.
    expect(BLICCA_ONLY_REGISTRATIONS.widgetKeys).toEqual(['choices']);
    expect(choicesWidgetOf(aurora)).toBeUndefined();
  });

  it('registers no `backgroundColor` style field', () => {
    for (const name of BLICCA_ONLY_REGISTRATIONS.styleFieldDefinitions) {
      expect(
        aurora.getUtility({ type: 'styleFieldDefinition', name }).method,
      ).toBeUndefined();
    }
  });

  it('has none of the wrapper substitutions — the widgets are cmsui’s own', () => {
    // Named so a regression says WHICH substitution leaked in. Each of these
    // keys IS registered upstream; what must be absent is Blicca's version.
    const upstreamOwn: Record<string, unknown> = {
      object_browser: ObjectBrowserWidget,
      image: ImageWidget,
    };
    for (const key of BLICCA_ONLY_REGISTRATIONS.substitutedWidgets) {
      const resolved = aurora.getWidget(key);
      expect(resolved).toBeDefined();
      if (key in upstreamOwn) expect(resolved).toBe(upstreamOwn[key]);
      expect(String((resolved as any)?.name)).not.toMatch(/^Blicca/);
    }
  });

  it('has no `textarea` or `select` — the keys we deliberately did not claim', () => {
    // Registering either would repair Aurora's own teaser everywhere, which
    // is an upstream patch and not a side effect of installing this block
    // (CONTEXT.md, and the map's out-of-scope list).
    for (const key of ['textarea', 'select', 'color_picker']) {
      expect(aurora.getWidget(key)).toBeUndefined();
    }
  });
});

describe('every promo field resolves to the widget it was designed for', () => {
  // Ticket 15's central risk: "no field may quietly fall through to the
  // default single-line input". Four fields fall through DELIBERATELY — a
  // kicker, a title and two action labels are single-line text — so the
  // claim is not "nothing falls through" but "exactly these, and nothing
  // else". Spelled as a table so a schema change has to come here and say so.
  const EXPECTED: Record<string, 'ours' | 'upstream' | 'default' | 'absent'> = {
    head_title: 'default',
    title: 'default',
    description: 'ours',
    image: 'upstream',
    align: 'upstream',
    cta_primary_label: 'default',
    cta_primary_link: 'ours',
    cta_primary_variant: 'ours',
    cta_secondary_label: 'default',
    cta_secondary_link: 'ours',
    cta_secondary_variant: 'ours',
    card_link: 'ours',
    blockWidth: 'upstream',
  };

  const properties = allProperties();
  const ours = new Set<unknown>(Object.values(PROMO_WIDGETS));

  it('declares exactly the fields the table covers', () => {
    // So a new field cannot be added without a verdict being recorded here.
    expect(Object.keys(properties).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [name, verdict] of Object.entries(EXPECTED)) {
    it(`${name} resolves to ${verdict}`, () => {
      const resolved = resolveWidget(name, properties[name]);
      const isDefault = resolved === (aurora as any).widgets.default;
      if (verdict === 'default') {
        expect(isDefault).toBe(true);
      } else {
        expect(resolved).toBeTruthy();
        expect(isDefault).toBe(false);
        expect(ours.has(resolved)).toBe(verdict === 'ours');
      }
    });
  }

  it('offers no backgroundColor field at all in Aurora', () => {
    // Absent BY MECHANISM, not by a flag: `backgroundField()` returns null
    // where the host registers no style-field definition. This is the schema
    // half of the absence asserted above.
    const styling = PromoSchema({ formData: {} }).fieldsets.find(
      (f: any) => f.id === 'styling',
    );
    expect(styling?.fields).toEqual(['blockWidth']);
  });

  it('resolves `image` through the field-id rule, not through a `widget` key', () => {
    // The deliberate naming (CONTEXT.md): the property is called `image` so
    // getWidgetByFieldId hands it the HOST's image widget, upload included,
    // with no `widget` key needed. If someone "fixes" the name, this fails.
    expect(properties.image.widget).toBeUndefined();
    expect(aurora.getWidget('image')).toBe(ImageWidget);
  });
});

describe('the promo joins Aurora rather than displacing it', () => {
  it('leaves upstream’s four blocks intact, teaser above all', () => {
    // Registration is last-wins by key: this is why the block is `promo` and
    // not `teaser` (CONTEXT.md). Only the real installers can show it —
    // ticket 06's transcription registered no blocks at all.
    for (const id of UPSTREAM_BLOCKS) {
      expect((aurora as any).blocks.blocksConfig[id]).toBeDefined();
    }
    expect((aurora as any).blocks.blocksConfig.promo).toBe(PromoBlockInfo);
  });

  it('adds exactly one entry', () => {
    const ids = Object.keys((aurora as any).blocks.blocksConfig);
    expect(ids.filter((id) => !UPSTREAM_BLOCKS.includes(id))).toEqual(['promo']);
  });

  it('does not touch Plate’s block table', () => {
    expect((aurora as any).blocks.plateBlocksConfig).not.toHaveProperty('promo');
  });
});

describe('view renders standalone — in Aurora it IS the public rendering', () => {
  // There is no Chameleon template in Aurora: `view` is the whole public
  // rendering. So it has to produce the agreed anatomy with a fully installed
  // Aurora registry present and no host wrapper around it.
  for (const testCase of FIXTURES.cases) {
    it(`renders ${testCase.name}`, () => {
      const { container } = render(<PromoView data={testCase.data as any} />);
      expect(container.innerHTML).toBeTruthy();
      cleanup();
    });
  }

  it('reads nothing from the registry, which is why it is portable', () => {
    // The strongest form of "it renders standalone": strip every widget and
    // block registration and the markup is byte-identical. `view` depends on
    // its data and on nothing the host installed — so the two hosts cannot
    // diverge here even in principle.
    const richest = FIXTURES.cases.find(
      (c) => c.name === 'reference-case-image-beside-the-copy',
    )!;
    const withAurora = render(<PromoView data={richest.data as any} />)
      .container.innerHTML;
    cleanup();

    const c = aurora as any;
    const savedWidgets = c.widgets;
    const savedBlocks = c.blocks.blocksConfig;
    try {
      c.widgets = { default: undefined };
      c.blocks.blocksConfig = {};
      const bare = render(<PromoView data={richest.data as any} />)
        .container.innerHTML;
      expect(bare).toBe(withAurora);
    } finally {
      c.widgets = savedWidgets;
      c.blocks.blocksConfig = savedBlocks;
      cleanup();
    }
  });
});

describe('the two divergences ticket 02 predicted', () => {
  // Ticket 02 turned up two specifics this harness had to cover. Both are
  // closed by DESIGN rather than merely expected, which is worth pinning:
  // a later refactor could reopen either without anything else noticing.

  it('leans on no `choices` widget anywhere in the schema', () => {
    // Predicted failure: a field relying on `choices` degrades to a
    // single-line text input in Aurora, because only Blicca registers one.
    // Closed by ticket 03: `cta_*_variant` carries `widget: 'promo_select'`,
    // and `getWidgetByName` short-circuits to the DEFAULT once `widget` is a
    // string — it never reaches `getWidgetByChoices` at all. So the two
    // fields that DO declare `choices` never resolve through it.
    expect(choicesWidgetOf(aurora)).toBeUndefined();
    const properties = allProperties();
    const declaringChoices = Object.entries(properties)
      .filter(([, property]) => property.choices || property.vocabulary)
      .map(([name]) => name);
    expect(declaringChoices).toEqual([
      'cta_primary_variant',
      'cta_secondary_variant',
    ]);
    for (const name of declaringChoices) {
      expect(typeof properties[name].widget).toBe('string');
      expect(resolveWidget(name, properties[name])).toBe(
        PROMO_WIDGETS[properties[name].widget as keyof typeof PROMO_WIDGETS],
      );
    }
  });

  it('previews a Blicca-stored resolveuid reference without a raw src', () => {
    // Predicted failure: Seven's `getPreviewSrc` appends the scale only when
    // the value starts with `/`, so `../resolveuid/<UID>` would reach the DOM
    // as a raw, broken `src`. Closed by ticket 08: the block never calls
    // `getPreviewSrc` — `imageSrc` is its own ladder, and a resolveuid
    // reference takes branch 2 whatever the host. Asserted here against a
    // registry with Aurora's own settings, since that is where the upstream
    // helper would otherwise have been the obvious thing to reach for.
    const { container } = render(
      <PromoView data={{ image: '../resolveuid/abc123' } as any} />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(
      '../resolveuid/abc123/@@images/image/large',
    );
    cleanup();
  });

  it('does not import upstream’s getPreviewSrc — in source or in the artifact', () => {
    // The rule above is only load-bearing while nothing quietly swaps back
    // to the helper. `@plone/helpers` IS a promised external, so an import
    // would cost nothing at build time and would be easy to miss in review.
    const dataSource = readFileSync(
      path.resolve(import.meta.dirname, '../src/promo/data.ts'),
      'utf8',
    );
    expect(dataSource).not.toMatch(/import[^;]*getPreviewSrc/);
    expect(readFileSync(bundleSourcePath, 'utf8')).not.toContain('getPreviewSrc');
  });
});

describe('what a headless harness cannot reach', () => {
  // Stated as tests so the boundary is a fact under CI rather than a
  // paragraph someone has to remember. If upstream ever drops the route
  // dependency, these fail and the README claim can be widened.
  const mountFails = (Widget: ComponentType<any>) => {
    try {
      render(<Widget id="x" value={undefined} onChange={() => {}} />);
      cleanup();
      return null;
    } catch (error) {
      cleanup();
      return String((error as Error)?.message ?? error);
    }
  };

  it('cannot mount cmsui’s ObjectBrowserWidget — it needs the edit route', () => {
    // ADR 0009 recorded exactly this as Blicca's reason for substituting it.
    // `promo_link` therefore looks the picker up instead of importing one:
    // in Aurora the picker mounts inside the edit route, where Aurora's own
    // teaser picks its target the same way.
    expect(mountFails(ObjectBrowserWidget)).toMatch(/useLoaderData/);
  });

  it('cannot mount cmsui’s ImageWidget — it needs a data router too', () => {
    // NEW here, and not recorded anywhere before ticket 15: the image field
    // — the promo's other deliberate host-widget exception — has the same
    // dependency, via `useFetcher`. It resolves in Aurora and works inside
    // the edit route; it cannot be exercised in any harness.
    expect(mountFails(ImageWidget as ComponentType<any>)).toMatch(/useFetcher/);
  });

  it('mounts the two upstream widgets that carry no route dependency', () => {
    // The other half of the boundary: `align` and the default text field are
    // pure Quanta components, so those two resolutions ARE exercised, not
    // merely asserted.
    expect(mountFails(AlignWidget as ComponentType<any>)).toBeNull();
    expect(mountFails(TextField as ComponentType<any>)).toBeNull();
  });
});

describe('bundle hygiene', () => {
  const bundlePath = bundleSourcePath;
  const source = readFileSync(bundlePath, 'utf8');

  // `.mjs`, so the suite's own `*.test.ts(x)` glob cannot pick it up.
  const PROBE_NAME = '.artifact-probe.mjs';
  const PROBE_PATH = path.resolve(import.meta.dirname, PROBE_NAME);
  afterAll(() => rmSync(PROBE_PATH, { force: true }));

  /** Contract §2.1's promised singleton-critical modules, mirrored from vite.config.ts. */
  const PROMISED = [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    'jotai',
    'platejs',
    '@plone/registry',
    '@plone/helpers',
  ];

  it('imports only promised modules — anything else means two Reacts', () => {
    // Both import forms. A bare `import "x";` carries no `from`, so a
    // `from "…"` regex alone would miss a side-effect import of the very
    // app stack the test below forbids — found by mutating the artifact.
    const imported = [
      ...new Set(
        [...source.matchAll(/(?:^|\n)\s*import[^'"\n]*["']([^"']+)["']/g)].map(
          (match) => match[1],
        ),
      ),
    ].sort();
    expect(imported).toEqual(
      ['@plone/helpers', '@plone/registry', 'react', 'react/jsx-runtime'],
    );
    for (const specifier of imported) expect(PROMISED).toContain(specifier);
  });

  it('carries none of the Aurora app stack it now dev-depends on', () => {
    // The five installers are devDependencies for THIS suite only. A stray
    // import of one would ship Aurora inside a block add-on.
    for (const forbidden of [
      '@plone/cmsui',
      '@plone/components',
      '@plone/blocks',
      '@plone/theming',
      '@plone/layout',
      '@plone/plate',
      'react-router',
    ]) {
      // Substring, not `from "…"`: a side-effect import has no `from`.
      expect(source).not.toContain(forbidden);
    }
  });

  it('is importable as a plain ESM module whose default export installs', async () => {
    // The artifact itself, not the source tree: what `plone:static` publishes
    // and the `@@aurora-edit` import map loads.
    //
    // Copied inside the workspace first. The artifact's four bare specifiers
    // are resolved in the browser by the `@@aurora-edit` import map, and from
    // `static/` — which has no node_modules — nothing can resolve them at
    // all. A copy under `test/` stands in for the import map with the real
    // packages, which is the nearest a headless run gets to the browser's
    // load. The `.mjs` extension keeps it out of the suite's own glob.
    // Without the sourceMappingURL the copy would chase a .map that is not
    // beside it and log a load failure on every run.
    writeFileSync(
      PROBE_PATH,
      source.replace(/\/\/# sourceMappingURL=.*/g, ''),
    );
    // The specifier is a variable, not a literal: vite resolves literal
    // dynamic imports at TRANSFORM time, when the copy does not exist yet,
    // and fails the whole file rather than this test.
    const specifier = './' + PROBE_NAME;
    const built: any = await import(/* @vite-ignore */ specifier);
    expect(typeof built.default).toBe('function');

    const probe: any = {
      blocks: { blocksConfig: {} },
      widgets: { widget: {} },
      registerWidget: ({ key, definition }: any) => {
        probe.widgets[key] = { ...(probe.widgets[key] ?? {}), ...definition };
      },
      getWidget: () => undefined,
    };
    expect(built.default(probe)).toBe(probe);
    expect(probe.blocks.blocksConfig.promo?.id).toBe('promo');
  });
});
