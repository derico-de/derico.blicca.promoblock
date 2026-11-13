/**
 * The image placement picker: the host's `align` icon row, the one the block
 * width uses, handed the promo's four placements and their translated labels.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AlignWidget } from '@plone/components/quanta';

import { locales } from '../src/index';
import PromoSchema from '../src/promo/schema';
import {
  ImageBelowIcon,
  ImageLeftIcon,
  ImageRightIcon,
  ImageTopIcon,
} from '../src/promo/PlacementIcons';
import { editorIn } from './i18n';

const placement = () =>
  PromoSchema({ formData: { image: '/pic' } }).properties.align as Record<string, any>;

const labels = () =>
  Object.fromEntries(
    Object.entries(placement().actionsInfoMap as Record<string, [unknown, string]>).map(
      ([value, [, label]]) => [value, label],
    ),
  );

afterEach(() => {
  cleanup();
  editorIn('en');
});

describe('the image placement field', () => {
  it('offers the four placements, on top first', () => {
    expect(placement().widget).toBe('align');
    expect(placement().actions).toEqual(['center', 'left', 'right', 'below']);
    expect(placement().default).toBe('center');
  });

  it('gives each placement its own icon', () => {
    const icons = Object.fromEntries(
      Object.entries(placement().actionsInfoMap as Record<string, [unknown, string]>).map(
        ([value, [icon]]) => [value, icon],
      ),
    );
    expect(icons).toEqual({
      center: ImageTopIcon,
      left: ImageLeftIcon,
      right: ImageRightIcon,
      below: ImageBelowIcon,
    });
  });

  it('speaks English by default', () => {
    expect(placement().title).toBe('Image placement');
    expect(labels()).toEqual({
      center: 'Image on top',
      left: 'Image left',
      right: 'Image right',
      below: 'Image below',
    });
  });

  it('speaks the editor’s German', () => {
    editorIn('de');
    expect(placement().title).toBe('Bildposition');
    expect(labels()).toEqual({
      center: 'Bild oben',
      left: 'Bild links',
      right: 'Bild rechts',
      below: 'Bild unten',
    });
  });

  it('renders as four labelled icon radios in the host widget', () => {
    const { title, default: _default, ...props } = placement();
    render(<AlignWidget aria-label={title} value="below" onChange={() => {}} {...props} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    for (const name of ['Image on top', 'Image left', 'Image right', 'Image below']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    expect((screen.getByRole('radio', { name: 'Image below' }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe('the sticky text column field', () => {
  const sticky = () =>
    PromoSchema({ formData: { image: '/pic', align: 'left' } }).properties.sticky_copy as Record<
      string,
      any
    >;

  it('speaks English by default', () => {
    expect(sticky().title).toBe('Sticky text column');
    expect(sticky().description).toMatch(/image left or right/);
  });

  it('speaks the editor’s German', () => {
    editorIn('de');
    expect(sticky().title).toBe('Textspalte fixieren');
    expect(sticky().description).toMatch(/Bild links oder rechts/);
  });
});

describe('the catalogs the bundle exports', () => {
  const keys = (catalog: object, prefix = ''): string[] =>
    Object.entries(catalog).flatMap(([key, value]) =>
      typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
    );

  it('keep every string under the add-on’s own prefix', () => {
    expect(Object.keys(locales.en)).toEqual(['promoblock']);
    expect(Object.keys(locales.de)).toEqual(['promoblock']);
  });

  it('translate every English string into German', () => {
    expect(keys(locales.de).sort()).toEqual(keys(locales.en).sort());
  });
});
