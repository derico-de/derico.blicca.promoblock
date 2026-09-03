/**
 * `promo_link` — a text input over a bare link string, with the host's own
 * content picker behind a Browse disclosure.
 *
 * WHY NOT `object_browser`. The Promo's three link fields (`card_link`,
 * `cta_primary_link`, `cta_secondary_link`) must be able to hold a
 * `mailto:` — reference case A's secondary action is one. `object_browser`
 * cannot express that in either host: both schemas declare `allowExternals`
 * and **both widgets drop it** (zero non-test occurrences in cmsui's
 * `ObjectBrowserWidget`; Blicca substitutes a `pat-contentbrowser` host that
 * ignores it too). It also stores an array of enriched Brains, not a string.
 * So the field is free text, and the picker is added back on top.
 *
 * WHY THE PICKER IS LOOKED UP, NEVER IMPORTED. A block add-on cannot import
 * either implementation and stay portable: Blicca's is `pat-contentbrowser`
 * behind `PatternHost`, which does not exist in an npm-installed Aurora, and
 * upstream's calls `useLoaderData()` from the edit route — ADR 0009 records
 * that it "would crash under the one-route MemoryRouter" Blicca mounts.
 * `config.getWidget('object_browser')` returns whichever one the host
 * registered, and each works in its own host. Aurora's own teaser picks its
 * target from the block sidebar exactly this way, which is the evidence it
 * works there.
 *
 * `config` is the module singleton from `@plone/registry` — the same object
 * `install()` is handed, because the facade is external (contract §2.1) and
 * resolved through the `@@aurora-edit` import map to the host's own copy.
 * Looked up at render, not at module load, so registration order cannot
 * matter.
 *
 * FREE TEXT IS NEVER GATED. `mailto:`, `tel:` and site-relative paths are
 * typed, not picked. The picker is an affordance: if the host registers no
 * `object_browser`, the Browse control is simply absent and the field is a
 * plain text input. Dropping this widget entirely leaves the same string
 * behind a default `TextField`, so it needs no migration in either
 * direction — which is why ticket 03 could add it as a late refinement.
 *
 * NOTHING IS SCREENED HERE. Scheme validation is a render-time concern
 * (ticket 03 Q7's allowlist, spelled once in each renderer): a half-typed
 * `mail` must not be rejected mid-keystroke, and a value that arrived some
 * other way still has to be screened. This widget stores what it is given.
 */
import { useCallback, useId, useRef, useState, type ComponentType } from 'react';
import config from '@plone/registry';

import { FieldShell, controlClass, type FieldShellProps } from './field-shell';

/** What both hosts' `object_browser` hands back: `onChange(selected[])`. */
type PickedBrain = { '@id'?: unknown; UID?: unknown };

export type PromoLinkWidgetProps = FieldShellProps & {
  name?: string;
  defaultValue?: unknown;
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  /**
   * Forwarded to the host's picker untouched. Both hosts read
   * `pattern_options.selectableTypes` from here (Blicca's
   * `BliccaObjectBrowserWidget`, upstream's `UseObjectBrowserConfig`), so a
   * schema can constrain what is pickable without this widget knowing how.
   */
  widgetOptions?: Record<string, unknown>;
  onChange?: (value: string) => void;
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

/**
 * The stored string for a picked item.
 *
 * `../resolveuid/<UID>` when the brain carries a UID, its `@id` otherwise.
 *
 * CORRECTION TO TICKET 07, which said to write the `@id` and to accept that
 * the stored path would differ by host. Read against the hosts, writing the
 * `@id` is wrong in Blicca specifically: `aurora_edit.py` sets
 * `apiPath = portal.absolute_url()`, so the `@search` enrichment behind
 * `pat-contentbrowser` returns fully absolute ids — `http://<host>/<site>/kontakt`
 * — and persisting one bakes the deploy's hostname into content.
 *
 * `BliccaImageWidget` already reached this conclusion for the image field
 * and converts the same way. Doing it here makes the two hosts **converge**
 * rather than diverge: a resolveuid URL has no `apiPath` prefix to flatten,
 * resolves against the rendering page through the public `for="*"`
 * resolveuid view, survives a move or rename, and passes ticket 03 Q7's
 * allowlist as a site-relative path. Upstream brains carry `UID` as well —
 * it is in `selectedItemAttrs`' default set — so both hosts land on the same
 * spelling.
 *
 * The `@id` fallback is not dead code: `filterBrainAttributes` keeps only
 * the attributes actually present on the brain, so a host or a vocabulary
 * that omits `UID` still yields a usable link.
 */
export function storedLinkFor(item: PickedBrain | undefined): string {
  if (!item) return '';
  const uid = typeof item.UID === 'string' ? item.UID : '';
  if (uid) return `../resolveuid/${uid}`;
  return asText(item['@id']);
}

export function PromoLinkWidget(props: PromoLinkWidgetProps) {
  const { label, description, className, onChange } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const pickerId = useId();

  // Resolved per render: the host registers its widgets during bootstrap,
  // and a block's install() may run either side of that.
  const Picker = config.getWidget('object_browser') as
    | ComponentType<any>
    | undefined;

  const handlePicked = useCallback(
    (selected: PickedBrain[] | undefined) => {
      // An empty selection is a deselection inside the picker, not an
      // instruction to erase the field: the text input is the source of
      // truth here and may hold a typed mailto: the picker cannot express.
      const next = storedLinkFor(selected?.[0]);
      if (!next) return;
      // The input is uncontrolled (see PromoTextareaWidget on why), so a
      // programmatic set has to reach the DOM node itself.
      if (inputRef.current) inputRef.current.value = next;
      onChange?.(next);
      setBrowsing(false);
    },
    [onChange],
  );

  return (
    <FieldShell
      blockClass="promo-link-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <>
          <input
            ref={inputRef}
            id={controlId}
            name={props.name}
            type="text"
            required={props.required}
            placeholder={props.placeholder}
            defaultValue={asText(props.value ?? props.defaultValue)}
            onChange={(event) => onChange?.(event.target.value)}
            className={controlClass}
          />
          {Picker ? (
            <button
              type="button"
              aria-expanded={browsing}
              aria-controls={pickerId}
              onClick={() => setBrowsing((open) => !open)}
              className="w-fit text-xs font-medium text-quanta-pigeon underline"
            >
              Browse…
            </button>
          ) : null}
          {Picker && browsing ? (
            // Mounted only while open: Blicca's picker is a pattern island
            // with a network round trip, and a promo sidebar holds three of
            // these fields. No `label` — the shell above owns it, and
            // upstream's widget renders one of its own if given it.
            <div id={pickerId}>
              <Picker
                mode="single"
                widgetOptions={props.widgetOptions}
                onChange={handlePicked}
              />
            </div>
          ) : null}
        </>
      )}
    />
  );
}

export default PromoLinkWidget;
