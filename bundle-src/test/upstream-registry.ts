/**
 * An Aurora-shaped registry, and nothing more.
 *
 * Ticket 02 established that Blicca is upstream **plus deltas**, and that
 * the deltas are the risk this block carries: `choices` and
 * `backgroundColor`'s `styleFieldDefinition` are registered by the Blicca
 * wrapper and by nobody upstream, so a field that leans on either silently
 * degrades to a single-line text input in Aurora proper.
 *
 * So the fixture registers exactly what Aurora registers — the list below
 * is `@plone/cmsui`'s `config/widgets.ts` and `@plone/blocks`' one
 * `styleFieldDefinition`, transcribed — and the wrapper's seven overrides
 * are deliberately, load-bearingly absent. A test that passes only because
 * Blicca happened to be present proves nothing (ticket 15).
 *
 * The *registry itself* is the real `@plone/registry@4.0.0-alpha.1`, the
 * version the host provides: widget resolution searches every category flat
 * (ticket 01), and re-implementing that in a stub would mean testing our
 * copy of the rule rather than the rule.
 *
 * The widget components are placeholders — this fixture proves *which key
 * resolves*, not what the widget renders. Ticket 15 may swap in the real
 * cmsui installers; the assertions it needs (`align` resolves to upstream's
 * AlignWidget, `image` to cmsui's ImageWidget) are stated in terms of the
 * key, so they survive that swap.
 */
import type { ComponentType } from 'react';

export type UpstreamConfig = {
  blocks: { blocksConfig: Record<string, unknown>; widths?: unknown[] };
  widgets: Record<string, unknown>;
  registerWidget: (options: { key: string; definition: unknown }) => void;
  registerDefaultWidget: (widget: unknown) => void;
  getWidget: (key: string) => ComponentType<any> | undefined;
  registerUtility: (options: {
    type: string;
    name: string;
    method: unknown;
  }) => void;
  getUtility: (options: { type: string; name: string }) => { method?: unknown };
};

// Named so a failing test names the widget it expected, not `Anonymous`.
const placeholder = (name: string): ComponentType<any> => {
  const Widget: ComponentType<any> = () => null;
  Widget.displayName = name;
  return Widget;
};

/** Upstream's default widget: every unmatched field lands here. */
export const UpstreamTextField = placeholder('TextField');
export const UpstreamAlignWidget = placeholder('AlignWidget');
export const UpstreamImageWidget = placeholder('ImageWidget');
export const UpstreamObjectBrowserWidget = placeholder('ObjectBrowserWidget');

/**
 * `@plone/blocks`' four widths, verbatim. `blockWidth` is a style field, so
 * this list is what the sidebar control offers; the promo declares
 * `blockWidth` in its schema rather than fixing one (contract §1.4).
 */
export const UPSTREAM_WIDTHS = [
  {
    style: { '--block-width': 'var(--narrow-container-width)' },
    name: 'narrow',
    label: 'Narrow',
  },
  {
    style: { '--block-width': 'var(--default-container-width)' },
    name: 'default',
    label: 'Default',
  },
  {
    style: { '--block-width': 'var(--layout-container-width)' },
    name: 'layout',
    label: 'Layout',
  },
  { style: { '--block-width': '100%' }, name: 'full', label: 'Full Width' },
];

/**
 * Apply Aurora's registrations to a config. Mirrors, in order:
 * `@plone/cmsui`'s `install` (config/widgets.ts) and `@plone/blocks`'
 * `blockWidth` utility.
 */
export function installUpstreamRegistry<T extends UpstreamConfig>(config: T): T {
  // `@plone/blocks` creates `blocksConfig` — a bare `@plone/registry` has
  // none, so an install() called before it throws. This is also why the
  // host's bootstrap order is blocks-before-cmsui.
  config.blocks.blocksConfig = {};
  config.blocks.widths = UPSTREAM_WIDTHS;

  config.registerDefaultWidget(UpstreamTextField);

  config.registerWidget({
    key: 'id',
    definition: { recurrence: placeholder('RecurrenceWidget') },
  });
  config.registerWidget({
    key: 'widget',
    definition: { date: placeholder('DateField') },
  });
  config.registerWidget({
    key: 'widget',
    definition: { datetime: placeholder('DateTimePicker') },
  });
  config.registerWidget({
    key: 'widget',
    definition: { boolean: placeholder('Checkbox') },
  });
  config.registerWidget({
    key: 'widget',
    definition: { align: UpstreamAlignWidget },
  });
  config.registerWidget({
    key: 'widget',
    definition: { size: placeholder('SizeWidget') },
  });
  config.registerWidget({
    key: 'widget',
    definition: { width: placeholder('WidthWidget') },
  });
  config.registerWidget({
    key: 'widget',
    definition: { image: UpstreamImageWidget },
  });
  config.registerWidget({
    key: 'factory',
    definition: { 'Relation List': UpstreamObjectBrowserWidget },
  });
  config.registerWidget({
    key: 'widget',
    definition: { object_browser: UpstreamObjectBrowserWidget },
  });
  config.registerWidget({
    key: 'widget',
    definition: { querystring: placeholder('QuerystringWidget') },
  });
  config.registerWidget({
    key: 'vocabulary',
    definition: {
      'plone.app.vocabularies.Catalog': UpstreamObjectBrowserWidget,
    },
  });

  // @plone/blocks registers exactly one style-field definition. Blicca adds
  // `backgroundColor`; upstream does not, and this fixture must not.
  config.registerUtility({
    type: 'styleFieldDefinition',
    name: 'blockWidth',
    method: () => config.blocks.widths ?? [],
  });

  return config;
}

/**
 * The wrapper's overrides, listed so a test can assert their absence by
 * name rather than by a bare `toBeUndefined()`. Read off
 * `plone.blicca.auroraeditor`'s `wrapper/src/bootstrap/config.ts`.
 */
export const BLICCA_ONLY_REGISTRATIONS = {
  widgetKeys: ['choices'],
  styleFieldDefinitions: ['backgroundColor'],
  substitutedWidgets: [
    'object_browser',
    'image',
    'boolean',
    'querystring',
  ],
} as const;
