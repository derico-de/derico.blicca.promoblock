/**
 * The Promo's four sidebar widgets and their registration.
 *
 * All three keys are **namespaced**. `registerWidget` writes into one global
 * last-wins map (`_data.widgets[key][widgetKey] = definition[widgetKey]`),
 * so a block claiming a generic key changes every other block's fields in
 * the host. `textarea` and a working `choices` are both worth fixing for the
 * ecosystem — as an upstream patch, not as a side effect of installing this
 * block (map: out of scope).
 *
 * `key: 'widget'` puts them where `Field.tsx`'s `getWidgetByName` looks —
 * the lane a schema selects with `widget: 'promo_select'`. The category is
 * cosmetic for lookup, though: `config.getWidget` searches every category
 * flat, so the name is what must not collide, and `promo_` is what keeps it
 * from colliding.
 */
import { PromoTextareaWidget } from './TextareaWidget';
import { PromoSelectWidget } from './SelectWidget';
import { PromoLinkWidget } from './LinkWidget';
import { PromoImageWidget } from './ImageWidget';

export { PromoTextareaWidget } from './TextareaWidget';
export { PromoSelectWidget } from './SelectWidget';
export { PromoLinkWidget, storedLinkFor } from './LinkWidget';
export { PromoImageWidget } from './ImageWidget';

/** The only registry surface this module needs. */
type WidgetRegistrar = {
  registerWidget: (options: { key: string; definition: unknown }) => void;
};

/**
 * Schema `widget:` value → component. Also the list ticket 08 asserts.
 *
 * `promo_image` is reached through the schema property's `id`, not its
 * `widget` — `getWidgetByFieldId` outranks `getWidgetByName`, and the field
 * has to keep the name `image` on disk. Same map either way: `getWidget`
 * searches every category flat, so one registration serves both lanes.
 */
export const PROMO_WIDGETS = {
  promo_textarea: PromoTextareaWidget,
  promo_select: PromoSelectWidget,
  promo_link: PromoLinkWidget,
  promo_image: PromoImageWidget,
} as const;

/**
 * Registered from `install()`, against the config the loader hands us —
 * never the imported singleton — so a host that composes more than one
 * registry gets its widgets on the one it is building.
 */
export function registerPromoWidgets<T extends WidgetRegistrar>(config: T): T {
  config.registerWidget({ key: 'widget', definition: { ...PROMO_WIDGETS } });
  return config;
}
