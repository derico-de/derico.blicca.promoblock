import { jsxs, jsx } from "react/jsx-runtime";
const PromoView = () => /* @__PURE__ */ jsx("div", { className: "promo" });
const PromoEdit = (props) => /* @__PURE__ */ jsx(PromoView, { ...props });
const PromoIcon = () => /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 24 24", width: "24", height: "24", "aria-hidden": "true", children: [
  /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M7 10h6M7 14h4", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
] });
const PromoSchema = () => ({
  title: "Promo",
  fieldsets: [{ id: "default", title: "Default", fields: [] }],
  properties: {},
  required: []
});
const PromoBlockInfo = {
  id: "promo",
  title: "Promo",
  edit: PromoEdit,
  view: PromoView,
  blockSchema: PromoSchema,
  icon: PromoIcon,
  category: "promo"
};
function install(config) {
  config.blocks.blocksConfig.promo = PromoBlockInfo;
  return config;
}
export {
  PromoBlockInfo,
  install as default
};
//# sourceMappingURL=promo-block.js.map
