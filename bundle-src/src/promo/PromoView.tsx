/**
 * The Promo's markup — and in Aurora proper, its PUBLIC rendering. `view` is
 * not a preview convenience here; it is the block's other renderer, and the
 * Chameleon template in `views/promo_block_view.pt` (ticket 09) must emit the
 * same anatomy element for element, because ONE scope-wrapped stylesheet
 * (ticket 11) dresses both surfaces.
 *
 * The anatomy is ticket 17's table, verbatim and normative. Its shape, and
 * the reasons that survive restating:
 *
 * - **The root is our own `<div class="promo">`**, never the host's
 *   `.block-promo` wrapper stamp. `derico-hero` set the precedent for a
 *   measured reason; the promo's is simpler — the wrapper is the host's and
 *   this block has two hosts, and Aurora's stamp is unverified here (no
 *   `@plone/cmsui` in the checkout, no live Aurora per ticket 02). A block
 *   that owns its root does not care.
 * - **`has--align--<value>` is emitted always**, and carries the EFFECTIVE
 *   placement. `align` is a plain data field, so no plugin stamps it; one
 *   selector family in the sheet instead of two, and no image-presence class
 *   is needed anywhere.
 * - **The card link is a WRAPPER**, outside the root — not a root whose tag
 *   changes to `<a>`. `.promo`'s tag and class list are invariant across every
 *   state, which is the parity this exists to buy. The stretched-link overlay
 *   was rejected: it makes the stylesheet load-bearing for clickability, which
 *   is exactly what ticket 04 hands themes power over.
 * - **Every element is conditional on its own content**, and containers are
 *   never emitted empty. An empty promo is one element and nothing else.
 * - **The image is always `<picture>` + `<img>`**, on both surfaces, so
 *   ticket 09's `image_source()` branch is invisible to the sheet.
 *
 * No `alt` field exists — ticket 03 fixed the schema and did not add one — so
 * the picture is marked decorative. The title and description carry the
 * meaning, and an `alt` invented from `title` would be read twice.
 *
 * NO WHITESPACE-ONLY TEXT NODES. The Plate editable computes
 * `white-space: pre-wrap`, which inherits in and turns every newline between
 * two elements into a real line box. JSX drops inter-element whitespace, so
 * this file is safe by construction; ticket 09's template has to strip its own
 * indentation.
 */
import {
  actions,
  cardLink,
  effectiveAlign,
  imageSrc,
  text,
  type PromoData,
} from './data';

export type PromoViewProps = {
  data?: PromoData;
  /**
   * Set by `edit`. It suppresses `href` on every anchor and nothing else:
   * see `linkProps` below.
   */
  isEditMode?: boolean;
};

/**
 * `href` on the public page, nothing in the canvas.
 *
 * DECIDED IN TICKET 08. A live `href` on the card-link wrapper makes the
 * ENTIRE block a navigation target in the editor, so the author cannot click
 * to select the thing they are editing; on an action it throws away unsaved
 * work. Dropping the attribute leaves an `<a>` that is neither focusable nor
 * clickable while keeping the element, its tag and its classes identical — the
 * stylesheet cannot tell the two surfaces apart.
 *
 * CONSEQUENCE FOR TICKET 11: the sheet must never select on `[href]`, or the
 * canvas loses the styling the public page has. `.promo-cardlink` and
 * `.promo-cta` are the hooks.
 */
function linkProps(href: string, isEditMode?: boolean) {
  return isEditMode ? {} : { href };
}

export function PromoView({ data = {}, isEditMode }: PromoViewProps) {
  const kicker = text(data.head_title);
  const title = text(data.title);
  const description = text(data.description);
  const image = imageSrc(data);
  const cta = actions(data);
  const card = cardLink(data);

  const copy = kicker || title || description || cta.length > 0;

  const promo = (
    <div className={`promo has--align--${effectiveAlign(data)}`}>
      {image ? (
        <picture className="promo-image">
          <img src={image} alt="" decoding="async" loading="lazy" />
        </picture>
      ) : null}
      {copy ? (
        <div className="promo-copy">
          {kicker ? <p className="promo-kicker">{kicker}</p> : null}
          {title ? <h2 className="promo-title">{title}</h2> : null}
          {description ? <p className="promo-description">{description}</p> : null}
          {cta.length ? (
            <div className="promo-actions">
              {cta.map((action) => (
                <a
                  key={action.label}
                  className={`promo-cta promo-cta-${action.variant}`}
                  {...linkProps(action.href, isEditMode)}
                >
                  {action.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  // Never both a wrapper and an action anchor — `cardLink()` owns the click
  // rule, so no interactive element is ever nested in another.
  return card ? (
    <a className="promo-cardlink" {...linkProps(card, isEditMode)}>
      {promo}
    </a>
  ) : (
    promo
  );
}

export default PromoView;
