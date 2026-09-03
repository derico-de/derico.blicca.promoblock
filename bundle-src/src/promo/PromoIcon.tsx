/**
 * The slash-menu icon: a card with a kicker rule, a headline and a button.
 *
 * A React component, NEVER a string — the menu renders `<Icon />` and a
 * string breaks it. `currentColor` throughout, so the menu's own palette
 * drives it.
 */
export function PromoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M6.5 8.5h4" />
      <path d="M6.5 11.5h9" />
      <rect x="6.5" y="14" width="6" height="3" rx="1.5" />
    </svg>
  );
}

export default PromoIcon;
