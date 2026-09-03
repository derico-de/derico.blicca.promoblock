/**
 * Ticket 07's suite: the three sidebar widgets, mounted against the
 * **upstream** registry fixture.
 *
 * The fixture is the point. `test/upstream-registry.ts` registers what
 * Aurora registers and nothing the Blicca wrapper adds, so a widget that
 * only works because `choices` or a substituted `object_browser` happened to
 * be there fails here rather than in Aurora proper (ticket 02). Since
 * ticket 15 it does that by running Aurora's own installers, so the widgets
 * resolved below are cmsui's actual objects — which is why the two picker
 * tests now supply a stand-in: upstream's ObjectBrowserWidget needs the edit
 * route's loader data and throws in any harness.
 *
 * Every mount goes through `renderField`, which reproduces the prop envelope
 * `BlockSettingsFormRenderer` + `Field.tsx` actually build — the whole schema
 * property spread, `label` from `title`, `defaultValue` from the form state,
 * `onChange` taking the value — because that envelope, not our own type, is
 * what these widgets have to survive.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import config from '@plone/registry';
import type { ComponentType } from 'react';

import install from '../src/index';
import {
  PROMO_WIDGETS,
  PromoLinkWidget,
  PromoSelectWidget,
  PromoTextareaWidget,
  storedLinkFor,
} from '../src/widgets';
import {
  installUpstreamRegistry,
  UpstreamAlignWidget,
  UpstreamImageWidget,
  choicesWidgetOf,
} from './upstream-registry';

const upstream = installUpstreamRegistry(config as any);
install(upstream);

// vitest runs without `globals`, so testing-library registers no automatic
// afterEach — without this every render stacks in the same document and the
// queries below find the previous test's control too.
afterEach(cleanup);

/** The fixture's own picker, kept so a test that swaps it can put it back. */
const UpstreamObjectBrowser = (upstream as any).widgets.widget.object_browser;

/**
 * The props a widget really receives. Mirrors
 * `BlockSettingsFormRenderer` (spreads the schema property, then overrides
 * `label`, `name`, `defaultValue`, `required`, `error`) followed by
 * `Field.tsx` (`label: title`, `placeholder` defaulted, `onChange` wrapped).
 * Note what is absent and stays absent: `id`, and `value`.
 */
function renderField(
  Widget: ComponentType<any>,
  schemaProperty: Record<string, unknown>,
  {
    name = 'field',
    storedValue,
    onChange,
  }: { name?: string; storedValue?: unknown; onChange?: (value: any) => void } = {},
) {
  const props = {
    ...schemaProperty,
    className: 'mb-4',
    label: schemaProperty.title,
    name,
    defaultValue: storedValue,
    required: false,
    error: [],
    placeholder: (schemaProperty.placeholder as string) || 'Type something...',
    onChange,
  };
  return render(<Widget {...props} />);
}

describe('registration', () => {
  it('registers all three under namespaced keys', () => {
    for (const [key, widget] of Object.entries(PROMO_WIDGETS)) {
      expect(upstream.getWidget(key)).toBe(widget);
    }
  });

  it('claims no generic key — the ecosystem-wide fix is not ours to make', () => {
    // `textarea` and `select` stay unimplemented; `choices` stays Blicca-only.
    for (const key of ['textarea', 'select', 'color_picker']) {
      expect(upstream.getWidget(key)).toBeUndefined();
    }
    // `choices` needs the other access path — `getWidget` cannot see it.
    expect(choicesWidgetOf(upstream)).toBeUndefined();
  });

  it('leaves the host widgets the schema leans on untouched', () => {
    // `align` and `image` are the two deliberate host-widget exceptions
    // (CONTEXT.md); registering ours must not have shadowed either.
    //
    // Asserted by IDENTITY, not by name: since ticket 15 the fixture runs
    // cmsui's own installer, so these are the very objects Aurora resolves,
    // and `toBe` says so where a `displayName` string only described one.
    // (The real components carry no `displayName` at all — the placeholders
    // they replaced were the only reason that spelling ever passed.)
    expect(upstream.getWidget('align')).toBe(UpstreamAlignWidget);
    expect(upstream.getWidget('image')).toBe(UpstreamImageWidget);
  });
});

describe('promo_textarea', () => {
  const property = { title: 'Description', widget: 'promo_textarea' };

  it('names the control from the schema title, associated for real', () => {
    renderField(PromoTextareaWidget, property);
    const field = screen.getByLabelText('Description');
    expect(field.tagName).toBe('TEXTAREA');
    // The block sidebar passes no `id`; the widget must supply one anyway.
    expect(field.getAttribute('id')).toBeTruthy();
  });

  it('round-trips the value through onChange', () => {
    const onChange = vi.fn();
    renderField(PromoTextareaWidget, property, {
      name: 'description',
      storedValue: 'Ein CMS.',
      onChange,
    });
    const field = screen.getByLabelText('Description') as HTMLTextAreaElement;
    expect(field.value).toBe('Ein CMS.');
    fireEvent.change(field, { target: { value: 'Ein CMS, das bleibt.' } });
    expect(onChange).toHaveBeenCalledWith('Ein CMS, das bleibt.');
  });

  it('emits the empty string when cleared, which the schema reads as unfilled', () => {
    const onChange = vi.fn();
    renderField(PromoTextareaWidget, property, { storedValue: 'x', onChange });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renders a missing value as an empty control, not "undefined"', () => {
    renderField(PromoTextareaWidget, property);
    expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('');
  });

  it('does not swallow keys the surrounding editor listens for', () => {
    // The sidebar portals out of Plate's afterEditable slot, so it is a
    // sibling of the Editable and a guard here would only break the
    // document-level listeners. Assert the absence of one.
    const seen = vi.fn();
    document.addEventListener('keydown', seen);
    renderField(PromoTextareaWidget, property);
    fireEvent.keyDown(screen.getByLabelText('Description'), { key: 'Enter' });
    document.removeEventListener('keydown', seen);
    expect(seen).toHaveBeenCalled();
  });
});

describe('promo_select', () => {
  // The `cta_*_variant` property, verbatim from ticket 03's schema.
  const property = {
    title: 'Primary action style',
    widget: 'promo_select',
    choices: [
      ['button', 'Button'],
      ['link', 'Link'],
    ],
    default: 'button',
  };

  it('renders one option per choice, labelled from the pair', () => {
    renderField(PromoSelectWidget, property);
    const field = screen.getByLabelText('Primary action style') as HTMLSelectElement;
    expect([...field.options].map((option) => [option.value, option.text])).toEqual([
      ['button', 'Button'],
      ['link', 'Link'],
    ]);
  });

  it('round-trips the value through onChange', () => {
    const onChange = vi.fn();
    renderField(PromoSelectWidget, property, {
      name: 'cta_primary_variant',
      storedValue: 'button',
      onChange,
    });
    const field = screen.getByLabelText('Primary action style') as HTMLSelectElement;
    fireEvent.change(field, { target: { value: 'link' } });
    expect(onChange).toHaveBeenCalledWith('link');
  });

  it('shows the schema default when nothing is stored, and stores nothing', () => {
    // Ticket 03 Q5: the Promo seeds nothing at insert time and both
    // renderers fall back to `button` themselves. Showing it is not storing it.
    const onChange = vi.fn();
    renderField(PromoSelectWidget, property, { onChange });
    const field = screen.getByLabelText('Primary action style') as HTMLSelectElement;
    expect(field.value).toBe('button');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a stored value that is not among the choices visible', () => {
    renderField(PromoSelectWidget, property, { storedValue: 'ghost' });
    const field = screen.getByLabelText('Primary action style') as HTMLSelectElement;
    expect(field.value).toBe('ghost');
  });

  it('offers an empty row when there is neither a value nor a default', () => {
    const { title, choices } = property;
    renderField(PromoSelectWidget, { title, choices, widget: 'promo_select' });
    const field = screen.getByLabelText('Primary action style') as HTMLSelectElement;
    expect(field.value).toBe('');
  });
});

describe('promo_link', () => {
  const property = {
    title: 'Card link',
    description: 'Makes the whole promo clickable.',
    widget: 'promo_link',
  };

  it('is a text field over the bare string, so free text stays typeable', () => {
    const onChange = vi.fn();
    renderField(PromoLinkWidget, property, {
      name: 'card_link',
      storedValue: '/kontakt',
      onChange,
    });
    const field = screen.getByLabelText('Card link') as HTMLInputElement;
    expect(field.value).toBe('/kontakt');
    // The scheme a picker cannot express, and the reason this widget exists.
    fireEvent.change(field, { target: { value: 'mailto:md@derico.de' } });
    expect(onChange).toHaveBeenCalledWith('mailto:md@derico.de');
  });

  it('stores what it is given: screening is the renderers job, not the widgets', () => {
    // Ticket 03 Q7's allowlist runs at render, twice. Rejecting mid-keystroke
    // would make `mail` untypeable on the way to `mailto:`.
    const onChange = vi.fn();
    renderField(PromoLinkWidget, property, { onChange });
    fireEvent.change(screen.getByLabelText('Card link'), {
      target: { value: 'javascript:alert(1)' },
    });
    expect(onChange).toHaveBeenCalledWith('javascript:alert(1)');
  });

  it('offers Browse because the host registers an object_browser', () => {
    renderField(PromoLinkWidget, property);
    expect(screen.getByRole('button', { name: /browse/i })).toBeTruthy();
  });

  it('mounts the host picker only once Browse is pressed', () => {
    // Through a PROBE picker, not the host's own. Since ticket 15 the
    // registered `object_browser` is cmsui's real ObjectBrowserWidget, and
    // it calls `useLoaderData()` from Aurora's edit route — it throws the
    // moment it is mounted anywhere else, harness included (ADR 0009 records
    // the same fact as Blicca's reason for substituting it). That is a
    // property of upstream's widget, pinned on its own in
    // `aurora-harness.test.tsx`; what THIS test is about is our widget
    // mounting whatever is registered lazily, so it supplies something
    // mountable and watches when it appears.
    let mounted = 0;
    const Probe: ComponentType<any> = () => {
      mounted += 1;
      return null;
    };
    upstream.registerWidget({
      key: 'widget',
      definition: { object_browser: Probe },
    });
    try {
      renderField(PromoLinkWidget, property);
      const browse = screen.getByRole('button', { name: /browse/i });
      expect(browse.getAttribute('aria-expanded')).toBe('false');
      expect(mounted).toBe(0);
      fireEvent.click(browse);
      expect(browse.getAttribute('aria-expanded')).toBe('true');
      expect(mounted).toBeGreaterThan(0);
    } finally {
      upstream.registerWidget({
        key: 'widget',
        definition: { object_browser: UpstreamObjectBrowser },
      });
    }
  });

  it('writes the picked item into the string and closes the picker', () => {
    // Upstream's real picker cannot be mounted outside Aurora's edit route
    // (see above), so drive the contract both hosts share directly:
    // onChange(selected[]), which is the whole of what this widget consumes.
    const onChange = vi.fn();
    let picked: ((selected: unknown[]) => void) | undefined;
    const Capture: ComponentType<any> = (props: any) => {
      picked = props.onChange;
      return null;
    };
    upstream.registerWidget({
      key: 'widget',
      definition: { object_browser: Capture },
    });
    try {
      renderField(PromoLinkWidget, property, { onChange });
      fireEvent.click(screen.getByRole('button', { name: /browse/i }));
      // The host calls back outside React's event loop, so flush it as the
      // host's own async selection would arrive.
      act(() => {
        picked?.([{ '@id': 'http://localhost:8081/Plone/kontakt', UID: 'abc123' }]);
      });
      expect(onChange).toHaveBeenCalledWith('../resolveuid/abc123');
      // The input is uncontrolled, so the pick has to reach the DOM node.
      expect((screen.getByLabelText('Card link') as HTMLInputElement).value).toBe(
        '../resolveuid/abc123',
      );
      expect(
        screen.getByRole('button', { name: /browse/i }).getAttribute('aria-expanded'),
      ).toBe('false');
    } finally {
      upstream.registerWidget({
        key: 'widget',
        definition: { object_browser: UpstreamObjectBrowser },
      });
    }
  });

  it('hides Browse entirely where no object_browser is registered', () => {
    // Never a gate: a host without a picker still gets a usable link field.
    const widgets = (upstream as any).widgets.widget;
    const saved = widgets.object_browser;
    delete widgets.object_browser;
    try {
      renderField(PromoLinkWidget, property);
      expect(screen.queryByRole('button', { name: /browse/i })).toBeNull();
      expect(screen.getByLabelText('Card link')).toBeTruthy();
    } finally {
      widgets.object_browser = saved;
    }
  });
});

describe('storedLinkFor', () => {
  it('prefers ../resolveuid/<UID> over the @id', () => {
    // The correction recorded on the function: Blicca's apiPath is
    // portal.absolute_url(), so an @id carries the deploy hostname.
    expect(
      storedLinkFor({ '@id': 'http://localhost:8081/Plone/kontakt', UID: 'u1' }),
    ).toBe('../resolveuid/u1');
  });

  it('falls back to the @id when the brain carries no UID', () => {
    expect(storedLinkFor({ '@id': '/Plone/kontakt' })).toBe('/Plone/kontakt');
  });

  it('is empty for no selection', () => {
    expect(storedLinkFor(undefined)).toBe('');
  });
});
