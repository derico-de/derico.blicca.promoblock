/**
 * The Promo block's Aurora half — the npm entry point (`exports: "."`) and
 * the bundle entry the Vite lib build compiles into the Python package's
 * `static/promo-block.js`. One record, one bundle, one `install()`.
 *
 * WALKING SKELETON. Ticket 06 stands up the workspace; the entry exists so
 * the build, the externals assertion and the scope-wrap run against
 * something real. The pieces are filled in by:
 *
 *   - ticket 07 — `promo_textarea`, `promo_select`, `promo_link` widgets,
 *     registered here from `install()`
 *   - ticket 08 — `edit`, `view` and the anatomy classes (ticket 17)
 *   - ticket 03's schema, wired as `blockSchema`
 *
 * Deliberately absent, and staying absent: `defaultBlockWidth`. The schema
 * offers `blockWidth` instead, and contract §1.4 makes declaring both a
 * contradiction.
 */
import type { ComponentType } from 'react';
import './styles.css';

type BlockProps = { data?: Record<string, unknown> };

// Ticket 08 replaces this with the real renderer. In Aurora proper `view`
// *is* the public rendering, so this is not a preview convenience.
const PromoView: ComponentType<BlockProps> = () => <div className="promo" />;

// Ticket 08: delegates to `view` with `isEditMode`, adding only
// editor-honesty placeholders. Never inline field editing — the canvas is a
// preview and the sidebar does the editing.
const PromoEdit: ComponentType<BlockProps> = (props) => <PromoView {...props} />;

// A React component, never a string: a string icon breaks the slash menu
// (contract §1).
const PromoIcon: ComponentType = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 10h6M7 14h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Ticket 03 fixed the schema verbatim — three fieldsets, each with exactly
// one conditional field, always last. Ticket 08 wires it.
const PromoSchema = () => ({
  title: 'Promo',
  fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
  properties: {},
  required: [],
});

/**
 * `@type: promo` — not `teaser` (Aurora ships one, and registration is
 * last-wins by weight, so we would silently replace it) and not `highlight`
 * (already a Plate text mark rendering `<mark>` in the same renderer).
 *
 * `title` is a plain string: message descriptors degrade to
 * `defaultMessage`, and i18n is contract §10 open work. An entry missing a
 * well-formed `id` or `title` vanishes from the slash menu with no error —
 * check these two first if the block "doesn't appear".
 */
export const PromoBlockInfo = {
  id: 'promo',
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
  config.blocks.blocksConfig.promo = PromoBlockInfo;
  return config;
}
