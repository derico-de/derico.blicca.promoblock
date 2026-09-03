/**
 * `promo_textarea` — a multi-line control for the Promo's description.
 *
 * It exists because the ecosystem has none: `textarea` is declared in
 * `@plone/types`' widget union and **implemented by nobody** — not upstream
 * (`@plone/cmsui/config/widgets.ts` registers nine keys, none of them this
 * one) and not by the Blicca wrapper. A field asking for `textarea` falls
 * through `Field.tsx`'s resolution chain to `getWidgetDefault()` and comes
 * out as a single-line input. With the Promo edited from the sidebar only
 * (CONTEXT.md: the canvas is a preview), that is the difference between an
 * authorable description and a one-line box.
 *
 * NAMESPACED, never the generic `textarea` key. `registerWidget` is a
 * last-wins map keyed globally (`_data.widgets[key][widgetKey] = ...`), so
 * claiming `textarea` would change every other block's fields in the host —
 * including Aurora's own teaser description. That repair is worth making,
 * upstream, as a patch; it is not something a block add-on may do as a side
 * effect of being installed (map: out of scope).
 *
 * UNCONTROLLED, seeded from `defaultValue`. That is the shape known to work:
 * `BlockSettingsFormRenderer` passes `defaultValue={field.state.value}` and
 * **never passes `value`** (despite `FieldProps` declaring it), and
 * upstream's default `TextField` is react-aria's uncontrolled
 * `defaultValue`-only field. A controlled textarea would re-render from the
 * node on every keystroke — the schema function re-runs on each form change
 * — and put the caret at risk for nothing. `value` is still read first so
 * the widget also behaves if some other host does pass it.
 *
 * NO KEY GUARD, deliberately. The sidebar is a `createPortal` into
 * `#sidebar` from Plate's `render.afterEditable` slot, so it is a *sibling*
 * of the `Editable`, not a descendant: keydowns here never reach Plate's
 * editable handlers by React bubbling. Adding `stopPropagation` would
 * therefore buy nothing and would break the keys the surrounding editor
 * legitimately listens for at the document level (ticket 07: the textarea
 * "must not trap or swallow keys that the surrounding Plate editor needs").
 * Enter inserts a newline because nothing prevents its default.
 */
import { FieldShell, controlClass, type FieldShellProps } from './field-shell';

export type PromoTextareaWidgetProps = FieldShellProps & {
  name?: string;
  /** The stored value. See the module docstring on why this, not `value`. */
  defaultValue?: unknown;
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  onChange?: (value: string) => void;
};

/** The renderer spreads the whole schema property, so anything may arrive. */
const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

export function PromoTextareaWidget(props: PromoTextareaWidgetProps) {
  const { label, description, className, onChange } = props;
  return (
    <FieldShell
      blockClass="promo-textarea-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <textarea
          id={controlId}
          name={props.name}
          rows={props.rows ?? 4}
          required={props.required}
          placeholder={props.placeholder}
          defaultValue={asText(props.value ?? props.defaultValue)}
          onChange={(event) => onChange?.(event.target.value)}
          className={controlClass}
        />
      )}
    />
  );
}

export default PromoTextareaWidget;
