import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import config from "@plone/registry";
import { getStyleFieldDefinitionsFromRegistry } from "@plone/helpers";
import { useId, useRef, useState, useCallback, createElement } from "react";
const CTA_SLOTS$1 = ["primary", "secondary"];
const DEFAULT_VARIANT = "button";
const DEFAULT_ALIGN = "center";
const ALIGNMENTS = ["left", "right", "center"];
const PREVIEW_SCALE = "@@images/image/large";
const RESOLVEUID = /(?:^|\/)resolveuid\/([^/?#]+)/;
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
const LINK_SCHEMES = ["http", "https", "mailto", "tel"];
const IMAGE_SCHEMES = ["http", "https"];
function screen(value, schemes) {
  const raw = text(value);
  if (!raw || raw.startsWith("//")) return "";
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!scheme) return raw;
  return schemes.includes(scheme[1].toLowerCase()) ? raw : "";
}
const screenLink = (value) => screen(value, LINK_SCHEMES);
const screenImage = (value) => screen(value, IMAGE_SCHEMES);
function labelOf(data, slot) {
  return text(data[`cta_${slot}_label`]);
}
function action(data, slot) {
  const label = labelOf(data, slot);
  const href = screenLink(data[`cta_${slot}_link`]);
  if (!label || !href) return null;
  const stored = text(data[`cta_${slot}_variant`]);
  return { label, href, variant: stored === "link" ? "link" : DEFAULT_VARIANT };
}
function actions(data) {
  return CTA_SLOTS$1.map((slot) => action(data, slot)).filter(
    (entry) => entry !== null
  );
}
function hasAnyLabel(data) {
  return CTA_SLOTS$1.some((slot) => labelOf(data, slot) !== "");
}
function cardLink(data) {
  if (hasAnyLabel(data)) return "";
  return screenLink(data.card_link);
}
function storedImage(value) {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === "string") return first.trim();
  if (first && typeof first === "object") {
    const record = first;
    return text(record["@id"] ?? record.url);
  }
  return "";
}
function apiPath() {
  const settings = config.settings;
  return text(settings?.apiPath).replace(/\/+$/, "");
}
function derivedAreCurrent(data) {
  const stamp = text(data.image_ref);
  return stamp !== "" && stamp === storedImage(data.image);
}
function imageSrc(data) {
  if (derivedAreCurrent(data)) return screenImage(data.image_url);
  const stored = screenImage(storedImage(data.image));
  if (!stored) return "";
  const scaled = `${stored.replace(/\/+$/, "")}/${PREVIEW_SCALE}`;
  if (RESOLVEUID.test(stored) || stored.startsWith("/")) return scaled;
  const root = apiPath();
  if (root && stored.startsWith(`${root}/`)) return scaled;
  return stored;
}
function hasImage(data) {
  return imageSrc(data) !== "";
}
function effectiveAlign(data) {
  if (!hasImage(data)) return DEFAULT_ALIGN;
  const stored = text(data.align);
  return ALIGNMENTS.includes(stored) ? stored : DEFAULT_ALIGN;
}
function missing(data) {
  const gaps = [];
  if (!text(data.head_title)) gaps.push("kicker");
  if (!text(data.title)) gaps.push("title");
  if (!text(data.description)) gaps.push("description");
  if (!hasImage(data)) gaps.push("image");
  for (const slot of CTA_SLOTS$1) {
    if (!labelOf(data, slot) && !text(data[`cta_${slot}_link`])) {
      gaps.push(`${slot} action`);
    }
  }
  return gaps;
}
function warnings(data) {
  const notes = [];
  const picture = storedImage(data.image);
  if (picture && !hasImage(data)) {
    if (derivedAreCurrent(data) && screenImage(picture)) {
      notes.push(
        "The picture this promo points at no longer exists, so it renders without one."
      );
    } else {
      notes.push(
        `“${picture}” is not a kind of picture this block can show.`
      );
    }
  }
  for (const slot of CTA_SLOTS$1) {
    const label = labelOf(data, slot);
    const stored = text(data[`cta_${slot}_link`]);
    if (!label && !stored) continue;
    if (label && !stored) {
      notes.push(`The ${slot} action has a label but no link, so it does not render.`);
    } else if (!label && stored) {
      notes.push(`The ${slot} action has a link but no label, so it does not render.`);
    } else if (!screenLink(stored)) {
      notes.push(
        `The ${slot} action link “${stored}” is not a kind of link this block follows, so the action does not render.`
      );
    }
  }
  const card = text(data.card_link);
  if (card && hasAnyLabel(data)) {
    notes.push(
      "The card link is ignored while either action has a label — the actions take the clicks."
    );
  } else if (card && !screenLink(card)) {
    notes.push(`The card link “${card}” is not a kind of link this block follows.`);
  }
  if (text(data.align) && !hasImage(data)) {
    notes.push("The image placement is ignored: there is no image to place.");
  }
  return notes;
}
function linkProps(href, isEditMode) {
  return isEditMode ? {} : { href };
}
function PromoView({ data = {}, isEditMode }) {
  const kicker = text(data.head_title);
  const title = text(data.title);
  const description = text(data.description);
  const image = imageSrc(data);
  const cta = actions(data);
  const card = cardLink(data);
  const copy = kicker || title || description || cta.length > 0;
  const promo = /* @__PURE__ */ jsxs("div", { className: `promo has--align--${effectiveAlign(data)}`, children: [
    image ? /* @__PURE__ */ jsx("picture", { className: "promo-image", children: /* @__PURE__ */ jsx("img", { src: image, alt: "", decoding: "async", loading: "lazy" }) }) : null,
    copy ? /* @__PURE__ */ jsxs("div", { className: "promo-copy", children: [
      kicker ? /* @__PURE__ */ jsx("p", { className: "promo-kicker", children: kicker }) : null,
      title ? /* @__PURE__ */ jsx("h2", { className: "promo-title", children: title }) : null,
      description ? /* @__PURE__ */ jsx("p", { className: "promo-description", children: description }) : null,
      cta.length ? /* @__PURE__ */ jsx("div", { className: "promo-actions", children: cta.map((action2) => /* @__PURE__ */ jsx(
        "a",
        {
          className: `promo-cta promo-cta-${action2.variant}`,
          ...linkProps(action2.href, isEditMode),
          children: action2.label
        },
        action2.label
      )) }) : null
    ] }) : null
  ] });
  return card ? /* @__PURE__ */ jsx("a", { className: "promo-cardlink", ...linkProps(card, isEditMode), children: promo }) : promo;
}
function PromoEdit(props) {
  const data = props.data ?? {};
  const gaps = missing(data);
  const notes = warnings(data);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PromoView, { ...props, isEditMode: true }),
    gaps.length ? /* @__PURE__ */ jsxs("p", { className: "promo-incomplete", contentEditable: false, children: [
      "Still to fill in: ",
      gaps.join(", "),
      "."
    ] }) : null,
    notes.map((note) => /* @__PURE__ */ jsx("p", { className: "promo-notice", contentEditable: false, children: note }, note))
  ] });
}
function PromoIcon(props) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      "aria-hidden": "true",
      focusable: "false",
      ...props,
      children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "4.5", width: "18", height: "15", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M6.5 8.5h4" }),
        /* @__PURE__ */ jsx("path", { d: "M6.5 11.5h9" }),
        /* @__PURE__ */ jsx("rect", { x: "6.5", y: "14", width: "6", height: "3", rx: "1.5" })
      ]
    }
  );
}
const PROMO_BLOCK_TYPE = "promo";
const BACKGROUND_FIELD_NAME = "backgroundColor";
const CTA_SLOTS = ["primary", "secondary"];
const LABEL_FIELDS = CTA_SLOTS.map((slot) => `cta_${slot}_label`);
function filled(value) {
  if (typeof value === "string") return value.trim() !== "";
  return value != null && value !== false;
}
function backgroundField(data) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: PROMO_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME
  });
  const choices = definitions.filter((definition) => typeof definition?.name === "string").map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: "Background",
    choices,
    ...choices.some(([name]) => name === "none") ? { default: "none" } : {},
    styleField: true
  };
}
function ctaProperties(slot) {
  const label = slot === "primary" ? "Primary" : "Secondary";
  return {
    [`cta_${slot}_label`]: { title: `${label} action label` },
    [`cta_${slot}_link`]: {
      title: `${label} action link`,
      // Free text, not `object_browser`: neither host implements
      // `allowExternals`, so a picker cannot express the mailto: the first
      // reference case needs. `promo_link` wraps the host's OWN registered
      // object_browser behind a text input, so internal targets stay pickable
      // while the stored value remains a bare string.
      widget: "promo_link"
    },
    [`cta_${slot}_variant`]: {
      title: `${label} action style`,
      // `widget` outranks `choices` in Field.tsx's resolution order, and
      // `choices` is registered in Blicca only — so a promo field relying on
      // it would silently degrade to a text input in Aurora. promo_select
      // reads the `choices` prop spread from this property.
      widget: "promo_select",
      choices: [
        ["button", "Button"],
        ["link", "Link"]
      ],
      // NOT a storage guarantee — both renderers default to `button`
      // themselves (ticket 03 Q5, implemented in `promo/data.ts`).
      default: "button"
    }
  };
}
function PromoSchema({
  formData = {}
} = {}) {
  const hasImage2 = filled(formData.image);
  const hasAnyLabel2 = LABEL_FIELDS.some((field) => filled(formData[field]));
  const background = backgroundField(formData);
  return {
    title: "Promo",
    fieldsets: [
      {
        id: "default",
        title: "Default",
        fields: [
          "head_title",
          "title",
          "description",
          "image",
          ...hasImage2 ? ["align"] : []
        ]
      },
      {
        id: "actions",
        title: "Actions",
        fields: [
          "cta_primary_label",
          "cta_primary_link",
          "cta_primary_variant",
          "cta_secondary_label",
          "cta_secondary_link",
          "cta_secondary_variant",
          ...hasAnyLabel2 ? [] : ["card_link"]
        ]
      },
      {
        id: "styling",
        title: "Styling",
        fields: ["blockWidth", ...background ? [BACKGROUND_FIELD_NAME] : []]
      }
    ],
    properties: {
      // Aurora's spellings on disk, the author's words in the sidebar — so a
      // teaser<->promo migration stays a rename-free copy.
      head_title: { title: "Kicker" },
      title: { title: "Title" },
      // Namespaced, never the generic `textarea`: claiming that key would
      // silently change every other block's fields in this host.
      description: { title: "Description", widget: "promo_textarea" },
      // Named `image` DELIBERATELY: it is the name on disk, the one the server
      // half reads, and the one a teaser<->promo copy keeps. Do not "fix" it by
      // renaming it or by matching Aurora's image block, which spells it
      // `url` + widget: 'image'.
      //
      // `id`, on the other hand, is the ONLY lane that can put a widget in
      // front of that name: getWidgetByFieldId(id ?? name) runs first and
      // unconditionally, so a bare `image` field takes the host's own image
      // widget and never consults `widget`. That widget picks and uploads but
      // offers no way to UNSET what it picked in a block-settings form (in
      // either host), which left `align` — offered only while an image is set
      // — stuck on too. `promo_image` wraps the host's widget, keeping the
      // upload, and adds the clear action; the `widget` key repeats the choice
      // for a host that ever reorders the two lanes.
      image: { title: "Image", id: "promo_image", widget: "promo_image" },
      // A plain data field, not a style field (mirroring Aurora's image block),
      // so no plugin emits its modifier class — both renderers emit
      // `has--align--<value>` themselves. `center` means image ABOVE the copy.
      align: {
        title: "Image placement",
        description: "Where the picture sits. “Center” places it above the text.",
        widget: "align",
        actions: ["left", "right", "center"],
        default: "center"
      },
      ...ctaProperties("primary"),
      ...ctaProperties("secondary"),
      // The Promo's own target, offered only while both action labels are empty.
      // A value set earlier survives hidden and returns when the labels clear.
      // Last in its fieldset so appearing and disappearing reindexes nothing.
      card_link: {
        title: "Card link",
        description: "Makes the whole promo clickable. Ignored while either action has a label.",
        widget: "promo_link"
      },
      blockWidth: {
        title: "Block width",
        widget: "width",
        default: "default",
        styleField: true
      },
      ...background ? { [BACKGROUND_FIELD_NAME]: background } : {}
    },
    // Everything is authored, so everything can be left blank.
    required: []
  };
}
const labelClass = "w-fit cursor-default text-xs font-medium text-quanta-pigeon";
const controlClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
function FieldShell({
  label,
  description,
  className,
  blockClass,
  render
}) {
  const controlId = `${blockClass}-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `${blockClass} flex flex-col gap-1${className ? ` ${className}` : ""}`,
      children: [
        label ? /* @__PURE__ */ jsx("label", { htmlFor: controlId, className: labelClass, children: label }) : null,
        render(controlId),
        description ? /* @__PURE__ */ jsx("p", { className: "text-xs font-normal text-quanta-pigeon", children: description }) : null
      ]
    }
  );
}
const asText$2 = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
function PromoTextareaWidget(props) {
  const { label, description, className, onChange } = props;
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "promo-textarea-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsx(
        "textarea",
        {
          id: controlId,
          name: props.name,
          rows: props.rows ?? 4,
          required: props.required,
          placeholder: props.placeholder,
          defaultValue: asText$2(props.value ?? props.defaultValue),
          onChange: (event) => onChange?.(event.target.value),
          className: controlClass
        }
      )
    }
  );
}
const asText$1 = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
function PromoSelectWidget(props) {
  const { label, description, className, choices = [], onChange } = props;
  const stored = asText$1(props.value ?? props.defaultValue);
  const current = stored || asText$1(props.default);
  const known = choices.some(([value]) => value === current);
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "promo-select-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(
        "select",
        {
          id: controlId,
          name: props.name,
          required: props.required,
          value: current,
          onChange: (event) => onChange?.(event.target.value),
          className: controlClass,
          children: [
            current === "" ? /* @__PURE__ */ jsx("option", { value: "" }) : null,
            current !== "" && !known ? /* @__PURE__ */ jsx("option", { value: current, children: current }) : null,
            choices.map(([value, choiceLabel]) => /* @__PURE__ */ jsx("option", { value, children: choiceLabel }, value))
          ]
        }
      )
    }
  );
}
const asText = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
function storedLinkFor(item) {
  if (!item) return "";
  const uid = typeof item.UID === "string" ? item.UID : "";
  if (uid) return `../resolveuid/${uid}`;
  return asText(item["@id"]);
}
function PromoLinkWidget(props) {
  const { label, description, className, onChange } = props;
  const inputRef = useRef(null);
  const [browsing, setBrowsing] = useState(false);
  const pickerId = useId();
  const Picker = config.getWidget("object_browser");
  const handlePicked = useCallback(
    (selected) => {
      const next = storedLinkFor(selected?.[0]);
      if (!next) return;
      if (inputRef.current) inputRef.current.value = next;
      onChange?.(next);
      setBrowsing(false);
    },
    [onChange]
  );
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "promo-link-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: inputRef,
            id: controlId,
            name: props.name,
            type: "text",
            required: props.required,
            placeholder: props.placeholder,
            defaultValue: asText(props.value ?? props.defaultValue),
            onChange: (event) => onChange?.(event.target.value),
            className: controlClass
          }
        ),
        Picker ? /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-expanded": browsing,
            "aria-controls": pickerId,
            onClick: () => setBrowsing((open) => !open),
            className: "w-fit text-xs font-medium text-quanta-pigeon underline",
            children: "Browse…"
          }
        ) : null,
        Picker && browsing ? (
          // Mounted only while open: Blicca's picker is a pattern island
          // with a network round trip, and a promo sidebar holds three of
          // these fields. No `label` — the shell above owns it, and
          // upstream's widget renders one of its own if given it.
          /* @__PURE__ */ jsx("div", { id: pickerId, children: /* @__PURE__ */ jsx(
            Picker,
            {
              mode: "single",
              widgetOptions: props.widgetOptions,
              onChange: handlePicked
            }
          ) })
        ) : null
      ] })
    }
  );
}
function PromoImageWidget(props) {
  const { label, description, className, onChange } = props;
  const stored = storedImage(props.value ?? props.defaultValue);
  const preview = imageSrc({ image: stored });
  const [generation, setGeneration] = useState(0);
  const Picker = config.getWidget("image");
  const handlePicked = useCallback(
    // Both hosts call `onChange(value, extras)`; `Field.tsx` drops the extras
    // on the way out, and the promo's derived keys are the server's to
    // compute (ADR 0003), so only the reference is forwarded.
    (value) => onChange?.(typeof value === "string" ? value : null),
    [onChange]
  );
  const handleClear = useCallback(() => {
    setGeneration((n) => n + 1);
    onChange?.(null);
  }, [onChange]);
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "promo-image-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(Fragment, { children: [
        stored ? /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
          preview ? (
            // The canvas already requested this exact URL, so the
            // thumbnail costs no second round trip. A dangling reference
            // renders as a broken image, which is the honest answer.
            /* @__PURE__ */ jsx(
              "img",
              {
                src: preview,
                alt: "",
                className: "max-h-20 w-auto rounded-md border border-input object-cover"
              }
            )
          ) : /* @__PURE__ */ jsx("span", { className: "text-xs text-quanta-pigeon", title: stored, children: stored }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleClear,
              className: "w-fit text-xs font-medium text-quanta-pigeon underline",
              children: "Clear"
            }
          )
        ] }) : null,
        Picker ? /* @__PURE__ */ createElement(
          Picker,
          {
            ...props,
            key: generation,
            id: controlId,
            label: void 0,
            description: void 0,
            onChange: handlePicked
          }
        ) : /* @__PURE__ */ jsx("p", { className: "text-xs font-normal text-quanta-pigeon", children: "No image widget is registered in this editor." })
      ] })
    }
  );
}
const PROMO_WIDGETS = {
  promo_textarea: PromoTextareaWidget,
  promo_select: PromoSelectWidget,
  promo_link: PromoLinkWidget,
  promo_image: PromoImageWidget
};
function registerPromoWidgets(config2) {
  config2.registerWidget({ key: "widget", definition: { ...PROMO_WIDGETS } });
  return config2;
}
const PromoBlockInfo = {
  id: PROMO_BLOCK_TYPE,
  title: "Promo",
  edit: PromoEdit,
  view: PromoView,
  blockSchema: PromoSchema,
  icon: PromoIcon,
  category: "promo"
};
function install(config2) {
  registerPromoWidgets(config2);
  config2.blocks.blocksConfig[PROMO_BLOCK_TYPE] = PromoBlockInfo;
  return config2;
}
export {
  PROMO_BLOCK_TYPE,
  PromoBlockInfo,
  PromoEdit,
  PromoIcon,
  PromoSchema,
  PromoView,
  install as default
};
//# sourceMappingURL=promo-block.js.map
