/**
 * Reading the Promo's stored JSON — the one place the degradation table
 * lives on this side of the block.
 *
 * Nothing in the schema is `required` (ticket 03 Q5), so every function here
 * has to answer "absent" without throwing: a half-authored promo must
 * preview, save and publish. The table these implement is ticket 03's Q8,
 * and the **server half (ticket 09) implements the same table against the
 * same data** — a change here is a change to both, and the anatomy tests are
 * what catch a one-sided edit.
 *
 * Ticket 03's Q5 fallbacks are applied HERE rather than trusted from the
 * schema's `default` keys: those keys are spread into the widget as props and
 * are not reliably written to the node, so both renderers must carry the
 * fallbacks themselves.
 */
import config from '@plone/registry';

/** Everything the two renderers read. `unknown`, because nothing is required. */
export type PromoData = {
  head_title?: unknown;
  title?: unknown;
  description?: unknown;
  image?: unknown;
  align?: unknown;
  card_link?: unknown;
  cta_primary_label?: unknown;
  cta_primary_link?: unknown;
  cta_primary_variant?: unknown;
  cta_secondary_label?: unknown;
  cta_secondary_link?: unknown;
  cta_secondary_variant?: unknown;
  /** Injected by ticket 10's serializer; never authored, never persisted. */
  image_url?: unknown;
  image_scales?: unknown;
  image_field?: unknown;
};

/** The two action slots, in sidebar order. "primary" names appearance, not rank. */
export const CTA_SLOTS = ['primary', 'secondary'] as const;
export type CtaSlot = (typeof CTA_SLOTS)[number];

/** Ticket 03 Q5: a variant that was never stored renders as a button. */
export const DEFAULT_VARIANT = 'button';

/** Ticket 03 Q5 / ticket 17 rule 1: no usable placement means "above the copy". */
export const DEFAULT_ALIGN = 'center';

/** What the `align` widget can produce; anything else is not a placement. */
export const ALIGNMENTS = ['left', 'right', 'center'] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

/** The scale the canvas previews a picked image at. Preview only — the
 *  public page's resolution ladder is the server half's (ticket 09). */
const PREVIEW_SCALE = '@@images/image/large';

const RESOLVEUID = /(?:^|\/)resolveuid\/([^/?#]+)/;

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/* ── ticket 03 Q7: one allowlist, spelled twice ─────────────────────────── */

/**
 * The schemes a **link** may carry. An allowlist, not a blocklist: Q1 made
 * all three link fields author-typed free text, and a blocklist fails open on
 * the scheme nobody thought of.
 *
 * `path_of()` is unusable for this — `urlparse("mailto:…").path` is truthy,
 * so it strips the scheme and hands back a bare address.
 *
 * PARITY: the server half (ticket 09) spells the same two tables in Python.
 * They are extended together or not at all; `TestScreenParity` and its
 * vitest counterpart hold them level.
 */
export const LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const;

/** `mailto:` and `tel:` are meaningless as an `<img src>`. */
export const IMAGE_SCHEMES = ['http', 'https'] as const;

/**
 * `value` if it is a usable URL of an allowed scheme, `''` otherwise.
 *
 * A value with no scheme at all is a path — site-relative or document-
 * relative — and passes. `//host/x` is rejected: it is a protocol-relative
 * URL wearing a path's clothes, and the schemes it inherits are not screened.
 */
export function screen(value: unknown, schemes: readonly string[]): string {
  const raw = text(value);
  if (!raw || raw.startsWith('//')) return '';
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!scheme) return raw;
  return schemes.includes(scheme[1].toLowerCase()) ? raw : '';
}

export const screenLink = (value: unknown): string => screen(value, LINK_SCHEMES);
export const screenImage = (value: unknown): string => screen(value, IMAGE_SCHEMES);

/* ── the actions ────────────────────────────────────────────────────────── */

export type Action = { label: string; href: string; variant: string };

/** Was a label typed into this slot? The click rule is keyed on this, not on
 *  whether the slot renders — ticket 03 Q8 row 5. */
export function labelOf(data: PromoData, slot: CtaSlot): string {
  return text(data[`cta_${slot}_label` as keyof PromoData]);
}

/**
 * One rendering action, or `null`.
 *
 * Symmetric on purpose (ticket 03 Q8 rows 2 and 3): a label without a link
 * and a link without a label both render nothing, because a button that goes
 * nowhere is worse than an absent one.
 *
 * A link that FAILS the screen is treated exactly as an absent link. Q8's own
 * row 8 said such a link renders "as text, no href"; ticket 17's class table
 * then made `.promo-cta` conditional on "a label **and** a screened link", so
 * the text-only shape would emit an element the anatomy says cannot exist —
 * and would put back the dead button row 2 exists to remove. The canvas names
 * it instead (see `missing()`).
 */
export function action(data: PromoData, slot: CtaSlot): Action | null {
  const label = labelOf(data, slot);
  const href = screenLink(data[`cta_${slot}_link` as keyof PromoData]);
  if (!label || !href) return null;
  const stored = text(data[`cta_${slot}_variant` as keyof PromoData]);
  return { label, href, variant: stored === 'link' ? 'link' : DEFAULT_VARIANT };
}

export function actions(data: PromoData): Action[] {
  return CTA_SLOTS.map((slot) => action(data, slot)).filter(
    (entry): entry is Action => entry !== null,
  );
}

/** Any label typed in either slot — the whole of the click rule's condition. */
export function hasAnyLabel(data: PromoData): boolean {
  return CTA_SLOTS.some((slot) => labelOf(data, slot) !== '');
}

/**
 * The card link, or `''`.
 *
 * THE CLICK RULE, spelled once for both surfaces: any action label present ⇒
 * the actions take the clicks and the card link is ignored. Never both, so no
 * interactive element is ever nested inside another. A value hidden by a
 * label survives on disk untouched and returns when the labels clear.
 */
export function cardLink(data: PromoData): string {
  if (hasAnyLabel(data)) return '';
  return screenLink(data.card_link);
}

/* ── the image ──────────────────────────────────────────────────────────── */

/** The stored reference as a string, reading the legacy shapes the host's own
 *  `normalizeImageValue` reads. We never write those shapes back. */
export function storedImage(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === 'string') return first.trim();
  if (first && typeof first === 'object') {
    const record = first as Record<string, unknown>;
    return text(record['@id'] ?? record.url);
  }
  return '';
}

/** `config.settings.apiPath`, or `''` — a `@plone/types` Settings field, so
 *  it is the one host-provided value both hosts are known to carry. */
function apiPath(): string {
  const settings = (config as { settings?: { apiPath?: unknown } }).settings;
  return text(settings?.apiPath).replace(/\/+$/, '');
}

/**
 * The `<img src>` for this promo, on the React surface.
 *
 * DECIDED HERE (this ticket asked for it). Ticket 10's three derived keys
 * arrive with the restapi serialization, so a promo *loaded* from the server
 * carries them — but a freshly picked image is patched client-side as the
 * bare reference alone: `Field.tsx` drops the widget's `extras`, and Blicca's
 * node-patching side channel gates on `@type === 'image'` (ticket 01), so for
 * `promo` it never fires. The canvas therefore needs its own rule over the
 * raw string, with the derived keys as the richer path when present.
 *
 * Upstream's `getPreviewSrc` cannot be that rule: it appends the scale only
 * when the value starts with `/`, and Blicca stores `../resolveuid/<UID>`,
 * which it would emit as a raw, broken `src`.
 *
 * The rule, in order:
 *
 *  1. **`image_url`** — ticket 10's always-usable key. Present ⇒ the promo was
 *     loaded from the server and this is the honest answer for both an
 *     in-site picture and a free-text external one. Its absence is that
 *     ticket's signal for "no image", including a dangling reference.
 *  2. a **resolveuid** reference ⇒ append the scale and leave the value
 *     relative. Blicca's own `ImageWidget` documents why this resolves: the
 *     `resolveuid` view is registered `for="*"` and `ResolveUIDView` collects
 *     its subpath and 301s to `<target>/@@images/image/large`. Verified in
 *     `plone.outputfilters.browser.resolveuid`.
 *  3. a **site-relative path**, or an absolute URL **under `apiPath`** ⇒ it
 *     names content in this site, so append the scale. This is the branch
 *     that makes a just-picked image preview in Aurora proper, whose widget
 *     stores an absolute `@id`.
 *  4. any other **http(s)** URL ⇒ emit it whole. It is an external picture,
 *     and appending `@@images` to one is a guaranteed 404.
 *
 * No `srcset` is built from `image_scales`, deliberately: `w` descriptors
 * without `sizes` default to `100vw` and over-fetch, and `sizes` depends on
 * `blockWidth` and the theme's layout — neither of which this component can
 * know. The public page's ladder is the server half's job; adding a `srcset`
 * here later is additive and invisible to the stylesheet (ticket 17).
 *
 * THE ONE STATED DIVERGENCE FROM THE SERVER HALF. Ticket 10 makes the absence
 * of `image_url` its signal for "the picture is gone", so the server draws the
 * no-image layout for a dangling reference. This surface cannot tell that
 * apart from an image picked one second ago — both are `image` set with no
 * derived keys — and step 2 resolves the ambiguity in favour of the common
 * case, so a promo whose target was deleted keeps a `.promo-image` in the
 * canvas until the next load and shows a broken picture there. The two
 * renderers still agree on every node the server has serialized, which is
 * what anatomy parity is a claim about; this window is editor-only,
 * self-correcting, and named on the canvas by `warnings()`.
 */
export function imageSrc(data: PromoData): string {
  const derived = screenImage(data.image_url);
  if (derived) return derived;

  const stored = screenImage(storedImage(data.image));
  if (!stored) return '';

  const scaled = `${stored.replace(/\/+$/, '')}/${PREVIEW_SCALE}`;
  if (RESOLVEUID.test(stored) || stored.startsWith('/')) return scaled;

  const root = apiPath();
  if (root && stored.startsWith(`${root}/`)) return scaled;

  return stored;
}

export function hasImage(data: PromoData): boolean {
  return imageSrc(data) !== '';
}

/**
 * The class modifier's value — the **effective** placement, never the stored
 * one (ticket 17 rule 1). Emitted always, so an image-less promo carries
 * `has--align--center` and the sheet has one selector family, not two.
 */
export function effectiveAlign(data: PromoData): Alignment {
  if (!hasImage(data)) return DEFAULT_ALIGN;
  const stored = text(data.align) as Alignment;
  return ALIGNMENTS.includes(stored) ? stored : DEFAULT_ALIGN;
}

/* ── editor honesty ─────────────────────────────────────────────────────── */

/**
 * The empty slots, named — the canvas's labelled skeleton.
 *
 * Ticket 03 Q5 seeds nothing, so a fresh promo is a node carrying `@type` and
 * the author has no visible hint which slot is which; ticket 17 rule 3 keeps
 * the block root empty when there is nothing in it, so this list — rendered
 * OUTSIDE the root — is the hint. Order follows the sidebar.
 *
 * The image slot asks `hasImage`, not "is a string stored": a value that is
 * not a picture at all leaves the slot genuinely unfilled, and `warnings()`
 * says separately what is wrong with what was typed.
 */
export function missing(data: PromoData): string[] {
  const gaps: string[] = [];
  if (!text(data.head_title)) gaps.push('kicker');
  if (!text(data.title)) gaps.push('title');
  if (!text(data.description)) gaps.push('description');
  if (!hasImage(data)) gaps.push('image');
  for (const slot of CTA_SLOTS) {
    if (!labelOf(data, slot) && !text(data[`cta_${slot}_link` as keyof PromoData])) {
      gaps.push(`${slot} action`);
    }
  }
  return gaps;
}

/**
 * The values the renderers drop, each as a sentence the author can act on.
 *
 * This is what makes Q8's silent resolutions acceptable: every row that
 * discards something an author typed is announced on the canvas and nowhere
 * else. Rows 2 and 3 (a half-filled action), row 5 (a card link the labels
 * have orphaned), row 7 (an `align` with no image left to place), row 8 (a
 * link that fails the Q7 screen), and an image value that is not a picture URL
 * at all.
 *
 * A **dangling** image reference is deliberately NOT here: on this surface it
 * is indistinguishable from a just-picked one (see `imageSrc`), so claiming it
 * would mean crying wolf on the common case.
 */
export function warnings(data: PromoData): string[] {
  const notes: string[] = [];
  const picture = storedImage(data.image);
  if (picture && !hasImage(data)) {
    notes.push(
      `\u201c${picture}\u201d is not a kind of picture this block can show.`,
    );
  }
  for (const slot of CTA_SLOTS) {
    const label = labelOf(data, slot);
    const stored = text(data[`cta_${slot}_link` as keyof PromoData]);
    if (!label && !stored) continue;
    if (label && !stored) {
      notes.push(`The ${slot} action has a label but no link, so it does not render.`);
    } else if (!label && stored) {
      notes.push(`The ${slot} action has a link but no label, so it does not render.`);
    } else if (!screenLink(stored)) {
      notes.push(
        `The ${slot} action link \u201c${stored}\u201d is not a kind of link this block ` +
          `follows, so the action does not render.`,
      );
    }
  }
  const card = text(data.card_link);
  if (card && hasAnyLabel(data)) {
    notes.push(
      'The card link is ignored while either action has a label — the actions take the clicks.',
    );
  } else if (card && !screenLink(card)) {
    notes.push(`The card link \u201c${card}\u201d is not a kind of link this block follows.`);
  }
  if (text(data.align) && !hasImage(data)) {
    notes.push('The image placement is ignored: there is no image to place.');
  }
  return notes;
}
