/**
 * The Promo block's Aurora half — the npm entry point (`exports: "."`) and
 * the bundle entry the Vite lib build compiles into the Python package's
 * `static/promo-block.js`. One record, one bundle, one `install()`.
 *
 * One record per bundle is not tidiness: `loadBlockAddons` calls
 * `install(config)` per REGISTRY RECORD with no dedupe, so a shared bundle
 * registering several blocks would let one record's install re-register a
 * block another record had disabled, quietly killing the per-block `enabled`
 * kill switch (block add-on contract §1.3).
 *
 * Deliberately absent, and staying absent: `defaultBlockWidth`. The schema
 * offers `blockWidth` instead, and contract §1.4 makes declaring both a
 * contradiction — a schema style field wins, and the two reference cases want
 * different widths anyway.
 */
import PromoEdit from './promo/PromoEdit';
import PromoIcon from './promo/PromoIcon';
import PromoView from './promo/PromoView';
import PromoSchema, { PROMO_BLOCK_TYPE } from './promo/schema';
import { registerPromoWidgets } from './widgets';
import './styles.css';

/**
 * `@type: promo` — not `teaser` (Aurora ships one, and registration is
 * last-wins by weight, so we would silently replace it) and not `highlight`
 * (already a Plate text mark rendering `<mark>` in the same renderer).
 *
 * `title` is a plain string: message descriptors degrade to `defaultMessage`,
 * and i18n is contract §10 open work.
 *
 * SILENT-DROP GATE: an entry missing a well-formed `id` or `title` vanishes
 * from the slash menu with no error, and an `icon` given as a string breaks
 * the menu outright. Check those three first if the block "doesn't appear".
 */
export const PromoBlockInfo = {
  id: PROMO_BLOCK_TYPE,
  title: 'Promo',
  edit: PromoEdit,
  view: PromoView,
  blockSchema: PromoSchema,
  icon: PromoIcon,
  category: 'promo',
};

// The loader convention (block add-on contract §1): default-export an
// install function that registers the block and RETURNS the config.
export default function install(config: any) {
  // Before the block entry, so a host that reads the registry the moment a
  // block appears finds the widgets its schema names already present.
  registerPromoWidgets(config);
  config.blocks.blocksConfig[PROMO_BLOCK_TYPE] = PromoBlockInfo;
  return config;
}

export { PROMO_BLOCK_TYPE, PromoEdit, PromoIcon, PromoSchema, PromoView };
