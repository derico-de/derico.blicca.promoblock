/**
 * `promo_image` — the host's own image widget, with a **Clear** action and a
 * label wrapped around it.
 *
 * ## The gap this closes
 *
 * Neither host offers a way to unset a picked image from a block-settings
 * form. Blicca's `BliccaImageWidget` renders a bare `pat-contentbrowser`
 * island that is mounted EMPTY on every render pass — it never reads its own
 * `value`/`defaultValue` — so the selected-item chip (whose ✕ is the
 * pattern's own deselect) is gone the moment the sidebar is reopened, and an
 * image can be replaced but never removed. Upstream's `ImageWidget` does draw
 * a preview with a bin button, but gates it behind `selected`, a prop the
 * block-settings form never passes. So in both hosts the promo's image field
 * was one-way, and `align` — offered only while an image is set — was stuck
 * with it.
 *
 * ## Why it wraps rather than replaces
 *
 * The host's widget is still what picks and uploads: `config.getWidget('image')`
 * returns pat-contentbrowser-with-upload in Blicca and the drag/drop + URL
 * input in Aurora, and neither can be imported from a block add-on (the same
 * portability argument `promo_link` makes for `object_browser`). Only the
 * clear action and the chrome are ours.
 *
 * ## Why the schema needs an `id`
 *
 * `Field.tsx` resolves `getWidgetByFieldId(id ?? name)` FIRST and
 * unconditionally, so a field named `image` takes the host's image widget and
 * a `widget:` key is never consulted. The field keeps that name — it is the
 * name on disk, and the server half reads it — so the schema declares
 * `id: 'promo_image'` instead, which is the one lane that outranks the
 * name. Nothing else reads that `id`: `BlockSettingsFormRenderer` passes
 * `name={field.name}`, so the value still writes to `image`.
 *
 * That schema `id` is not what the host widget receives: it is overridden
 * with the label's own generated id, so the label points at a real control.
 * Blicca hands `props.id` straight to the pattern island as the DOM id of its
 * hidden input, which is why `field-shell` sanitizes what `useId()` returns.
 */
import { useCallback, useState, type ComponentType } from 'react';
import config from '@plone/registry';

import { imageSrc, storedImage } from '../promo/data';
import { FieldShell, type FieldShellProps } from './field-shell';

export type PromoImageWidgetProps = FieldShellProps & {
  name?: string;
  defaultValue?: unknown;
  value?: unknown;
  required?: boolean;
  /** Everything else the schema property carries, forwarded untouched. */
  [key: string]: unknown;
  onChange?: (value: string | null) => void;
};

export function PromoImageWidget(props: PromoImageWidgetProps) {
  const { label, description, className, onChange } = props;
  // Derived, never held in state: the sidebar round-trips a field change back
  // as a fresh `defaultValue` (it is the same round trip that makes `align`
  // appear the moment an image is picked), so local state could only be a
  // second, staler copy of the same fact.
  const stored = storedImage(props.value ?? props.defaultValue);
  const preview = imageSrc({ image: stored });

  // Remounts the host widget after a clear. Blicca's pattern island keeps its
  // own selected-item chip in Svelte state that nothing outside can reach, so
  // without this the sidebar would show a chip for an image the block no
  // longer has.
  const [generation, setGeneration] = useState(0);

  const Picker = config.getWidget('image') as ComponentType<any> | undefined;

  const handlePicked = useCallback(
    // Both hosts call `onChange(value, extras)`; `Field.tsx` drops the extras
    // on the way out, and the promo's derived keys are the server's to
    // compute (ADR 0003), so only the reference is forwarded.
    (value: unknown) => onChange?.(typeof value === 'string' ? value : null),
    [onChange],
  );

  const handleClear = useCallback(() => {
    setGeneration((n) => n + 1);
    // `null`, not `''` — the empty value both hosts write and both halves of
    // this block already read (`stored_image`, `storedImage`).
    onChange?.(null);
  }, [onChange]);

  return (
    <FieldShell
      blockClass="promo-image-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <>
          {stored ? (
            <div className="flex items-start gap-2">
              {preview ? (
                // The canvas already requested this exact URL, so the
                // thumbnail costs no second round trip. A dangling reference
                // renders as a broken image, which is the honest answer.
                <img
                  src={preview}
                  alt=""
                  className="max-h-20 w-auto rounded-md border border-input object-cover"
                />
              ) : (
                <span className="text-xs text-quanta-pigeon" title={stored}>
                  {stored}
                </span>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="w-fit text-xs font-medium text-quanta-pigeon underline"
              >
                Clear
              </button>
            </div>
          ) : null}
          {Picker ? (
            <Picker
              {...props}
              key={generation}
              id={controlId}
              // The shell owns both; upstream's widget renders its own if given
              // them, which would double every line.
              label={undefined}
              description={undefined}
              onChange={handlePicked}
            />
          ) : (
            <p className="text-xs font-normal text-quanta-pigeon">
              No image widget is registered in this editor.
            </p>
          )}
        </>
      )}
    />
  );
}

export default PromoImageWidget;
