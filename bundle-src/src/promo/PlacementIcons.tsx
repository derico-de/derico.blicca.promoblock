/**
 * The image placement picker's four icons, drawn like `@plone/icons`'
 * image-left and image-right, which have no top or below siblings. The
 * picker renders them as `<Icon size="base" aria-label={label} />`, so they
 * take the Quanta icon classes and carry the label themselves.
 */
type PlacementIconProps = {
  size?: string;
  className?: string;
  'aria-label'?: string;
};

function placementIcon(paths: string[], name: string) {
  function PlacementIcon({ size, className, ...rest }: PlacementIconProps) {
    const classes = ['q', 'icon', size && `icon-${size}`, className].filter(Boolean);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        role="img"
        focusable="false"
        className={classes.join(' ')}
        {...rest}
      >
        {paths.map((d) => (
          <path key={d} fillRule="evenodd" clipRule="evenodd" d={d} />
        ))}
      </svg>
    );
  }
  PlacementIcon.displayName = name;
  return PlacementIcon;
}

const FRAME_TOP = 'M5 2V12H19V2H5ZM17 4H7V10H17V4Z';
const FRAME_BOTTOM = 'M5 12V22H19V12H5ZM17 14H7V20H17V14Z';

export const ImageTopIcon = placementIcon(
  [FRAME_TOP, 'M2 14H22V16H2V14Z', 'M2 18H22V20H2V18Z'],
  'ImageTopIcon',
);

export const ImageLeftIcon = placementIcon(
  [
    'M2 5V15H14V5H2ZM12 7H4V13H12V7Z',
    'M22 17V19H2V17H22Z',
    'M22 5H16V7H22V5Z',
    'M16 9H22V11H16V9Z',
    'M22 13H16V15H22V13Z',
  ],
  'ImageLeftIcon',
);

export const ImageRightIcon = placementIcon(
  [
    'M10 5V15H22V5H10ZM20 7H12V13H20V7Z',
    'M22 17V19H2V17H22Z',
    'M8 5H2V7H8V5Z',
    'M2 9H8V11H2V9Z',
    'M8 13H2V15H8V13Z',
  ],
  'ImageRightIcon',
);

export const ImageBelowIcon = placementIcon(
  ['M2 4H22V6H2V4Z', 'M2 8H22V10H2V8Z', FRAME_BOTTOM],
  'ImageBelowIcon',
);
