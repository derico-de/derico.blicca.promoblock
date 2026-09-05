# derico.blicca.promoblock

A **Promo block** for the Aurora block editor in Plone 6. It renders a promo
card with a kicker, a title, a description, an optional image and up to two
calls to action, or alternatively makes the whole card one link. Everything
on the card is written by the author in the sidebar. Nothing is pulled from
another content item.

Typical uses:

- a call to action at the end of a page ("Get in touch", "Book a demo");
- a highlighted announcement with a picture beside the text;
- a card linking to a campaign page, with a kicker above the headline.

The block works with [plone.blicca.auroraeditor](https://github.com/derico-de/plone.blicca.auroraeditor),
which brings the Aurora editor and server-side rendering of Aurora blocks to
classic Plone 6. The editor half is also a plain Aurora block package
(`@derico/aurora-promo-block`) that can be used in an Aurora frontend
directly, see [Using the block in Aurora](#using-the-block-in-aurora).

## Features

- **Authored content.** Kicker, title, description, image, two actions and a
  card link, all written in the sidebar. Nothing is required, so a
  half-finished promo can be saved and published.
- **Image left, right or above.** With an image, the card is two columns with
  the image on the chosen side. Without one, or below a width of 34rem, the
  card stacks and centres.
- **Two actions, each a button or a link.** Each action has a label, a link
  and a style. Links can be site content picked from the browser, or a typed
  URL, `mailto:` or `tel:` address.
- **Card link.** If no action has a label, a single link makes the whole
  card clickable.
- **Images stay in sync.** Only the reference to the image is stored. The
  URL and the responsive scales are computed on every load, so a rescaled or
  deleted picture never leaves a broken `<img>` behind.
- **Honest editor preview.** The canvas shows which fields are still empty
  and explains anything the author typed that will not render, such as an
  action with a label but no link.
- **Same markup on every surface.** The public page, the editor canvas and an
  Aurora frontend render the same HTML, dressed by one stylesheet.
- **Themeable through CSS custom properties.** Nineteen `--promo-*`
  properties control spacing, image, type and buttons. A theme sets
  properties, never rules.
- **Block width and background** come from the host's regular block styling
  controls.

## Requirements

- Plone 6.0 or later
- `plone.blicca.auroraeditor` 1.0.0a2 or later

The JavaScript bundle is committed to the package. Nothing needs Node at
install time.

## Installation

Add the package to your project's dependencies:

```toml
# pyproject.toml
dependencies = [
    "derico.blicca.promoblock",
]
```

Then install **Derico Blicca Promoblock** from Plone's Add-ons control
panel, or apply the `derico.blicca.promoblock:default` GenericSetup profile.
The profile registers the block with the Aurora editor for that site.
Uninstalling removes the registration again.

## Using the block

Insert the **Promo** block and fill in the sidebar. The canvas is a live
preview; all editing happens in the sidebar.

**Default fieldset**

| Field | What it does |
|---|---|
| Kicker | Short line above the title |
| Title | The headline, rendered as an `h2` |
| Description | Plain text below the title |
| Image | Pick or upload a picture. The host's image widget is used, so it looks the same as in every other block |
| Image placement | Left, right or center. Shown only once an image is set. Center puts the picture above the text |

**Actions fieldset**

| Field | What it does |
|---|---|
| Primary action label, link, style | The first call to action. Style is Button or Link |
| Secondary action label, link, style | The second one, same shape |
| Card link | Makes the whole card clickable. Shown only while both action labels are empty |

**Styling fieldset**: block width, and a background colour if the theme
offers block backgrounds.

Rules worth knowing:

- An action renders only with both a label and a link. A label without a
  link, or a link without a label, renders nothing and the canvas says so.
- As soon as either action has a label, the card link is ignored. Its value
  stays stored and comes back when the labels are cleared. There is never a
  link nested inside another link.
- The link fields accept a picked content item or typed text. Typed links
  must be a path or use `http`, `https`, `mailto` or `tel`. Anything else is
  dropped.
- An image whose target has been deleted stops rendering on the next load.
  The card reflows to the no-image layout and the canvas shows a notice.
- The image is decorative and rendered with an empty `alt`. The title and
  description carry the meaning.

## Rendered markup

Both renderers emit exactly this structure. Every element appears only when
it has content, and no container is emitted empty, so an empty promo is one
`<div>`.

```html
<a class="promo-cardlink" href="…">                <!-- only with an active card link -->
  <div class="promo has--align--left">
    <picture class="promo-image"><img …></picture> <!-- only with an image -->
    <div class="promo-copy">
      <p class="promo-kicker">…</p>
      <h2 class="promo-title">…</h2>
      <p class="promo-description">…</p>
      <div class="promo-actions">                  <!-- only with a rendering action -->
        <a class="promo-cta promo-cta-button" href="…">…</a>
        <a class="promo-cta promo-cta-link" href="…">…</a>
      </div>
    </div>
  </div>
</a>
```

- The root `div.promo` always carries `has--align--<value>` with the
  placement that is actually in effect: `center` whenever there is no image,
  whatever was stored.
- The action style is spelled as a class, `promo-cta-button` or
  `promo-cta-link`. There is no class for primary or secondary; DOM order
  tells them apart.
- The block width and background classes (`block`, `block-promo`,
  `has--block-width--*`, `has--backgroundColor--*`) are added by the host on
  a wrapper around this markup, as for every Aurora block.

## How it works

The block stores its text fields, the image reference, the link strings, the
placement and the action styles. The image is the only field the server
touches:

1. On every load of a page, a `plone.restapi` block serialization transformer
   resolves the stored image reference and injects `image_url`,
   `image_scales` and `image_field` into the block data, plus `image_ref`,
   the reference those three were derived from. A reference whose target is
   gone gets `image_ref` but no `image_url`, which is how both renderers know
   to draw the no-image layout.
2. On save, a matching deserialization transformer strips all four keys
   again, so derived image data is never written to the database.
3. The renderers read `image_url` and the scales and build the `<picture>`.
   A freshly picked image that has not been serialized yet is previewed in
   the canvas from the reference itself, and `image_ref` lets the canvas
   tell a stale derived set from a fresh one.

The transformers are registered for content with the `IBlocks` behavior and
for the site root, so a promo in a footer stored on the site root works on
every page. Nested blocks inside a text container are transformed too.

There are two renderers that produce the same markup:

- a Chameleon template, registered as the `@@aurora-block-promo` view, for
  the public page rendered by Blicca;
- a React `view` component, used for the preview in the editor canvas and for
  the public rendering in an Aurora frontend.

The rules that decide what renders (defaults, the click rule, the link
screen, the effective placement) are spelled once per language, in
`promo_data.py` and in `bundle-src/src/promo/data.ts`. The Python test suite
reads the TypeScript file to keep the two in step. One `@scope`-wrapped
stylesheet styles both surfaces, and a shared fixture file,
`tests/anatomy-cases.json`, is read by the Python and the vitest suites
alike, so the two renderers cannot drift apart unnoticed.

The two-column layouts collapse to the stacked layout through a container
query on the block's own width, not a media query. The editor canvas and the
published page are different widths at the same viewport, and a viewport
query would get the canvas wrong.

## Theming

The block is styled through nineteen CSS custom properties. They are the
entire styling interface: set properties on `:root` or on your theme's own
scope root, where they inherit into the block. Do not set them on `.promo`
itself and do not override the block's rules directly. The block's
stylesheet is `@scope`-wrapped, and a scoped declaration wins over an
unscoped one of equal specificity, so a plain rule in the theme would lose.

The block declares none of these properties. Every default is spelled at its
point of use as `var(--promo-x, <default>)`, so a value set on `:root`
inherits in and wins without any specificity games. The defaults are plain
literals rather than `--plone-*` or `--aurora-*` tokens, because those
vocabularies differ between themes and are absent in an Aurora frontend. A
theme that wants its own scale sets the property to its own token, for
example `--promo-title-size: var(--plone-text-2xl)`.

| property | default | what it controls |
|---|---|---|
| `--promo-gap` | `2rem` | gap between the image column and the copy column |
| `--promo-flow` | `0.75rem` | rhythm inside the copy stack, including between the two actions |
| `--promo-padding` | `0` | inner padding of the block root |
| `--promo-measure` | `60ch` | max width of the copy |
| `--promo-border` | `none` | border on the block root |
| `--promo-radius` | `0` | corner radius of the block root |
| `--promo-image-width` | `1fr` | the image's grid track at `left` / `right` |
| `--promo-image-ratio` | `auto` | `aspect-ratio` of the image box |
| `--promo-image-radius` | `0` | corner radius of the image |
| `--promo-kicker-size` | `0.875rem` | kicker font size |
| `--promo-kicker-color` | `currentColor` | kicker colour |
| `--promo-title-size` | `1.75rem` | title font size |
| `--promo-description-size` | `1rem` | description font size |
| `--promo-link-color` | `currentColor` | the `link` action style, and the card link |
| `--promo-cta-bg` | `CanvasText` | button background |
| `--promo-cta-fg` | `Canvas` | button text colour |
| `--promo-cta-hover-bg` | `color-mix(in oklab, var(--promo-cta-bg, CanvasText) 88%, var(--promo-cta-fg, Canvas))` | button background on hover |
| `--promo-cta-radius` | `0.375rem` | button corner radius |
| `--promo-cta-border` | `none` | button border |

Example, a rounded card with a brand-coloured button:

```css
:root {
  --promo-padding: 2rem;
  --promo-border: 1px solid var(--my-border-color);
  --promo-radius: 1rem;
  --promo-image-radius: 0.5rem;
  --promo-image-ratio: 4 / 3;
  --promo-cta-bg: var(--my-brand-color);
  --promo-cta-fg: white;
}
```

Notes:

- The padding defaults to `0` because the host's background band already
  pads the block. Turn padding on together with a border or a background of
  your own.
- The copy width is always capped, so a centred promo at full block width
  does not run its text across the whole bleed.
- The image ratio defaults to `auto`. Setting a ratio crops the image with
  `object-fit: cover`.
- The image width is a grid track, so `1fr`, `22rem` and `40%` all work.
- The hover background is derived from whatever fill and text colour the
  theme set, so a theme that sets only the fill still gets a hover state.
- A button border exists so a theme can express a ghost button.
- There is no background or foreground property. The block's ground is the
  host's background band, chosen with the block's own background control.
- The block sets no focus outline and no font weight, line height or text
  transform. The host's focus style and the theme's heading styles apply
  unchanged. One visible consequence: the title has the theme's `h2` weight
  on the public page and the editor's body weight in the canvas.

On the host's `dark` background band, Blicca forces every descendant's text
colour to the band's foreground. That flattens the kicker colour, the link
colour and the button text colour on that band. The button background still
applies, so set `--promo-cta-bg` to a colour that works with the band's text
colour.

Versioning of this interface: adding a property is a minor release. Removing
or renaming a property, or changing a default, is a breaking change. See
[ADR 0002](docs/adr/0002-seam-defaults-live-at-their-point-of-use.md) for
the reasoning.

## Using the block in Aurora

The editor half lives in `bundle-src/` as the npm package
`@derico/aurora-promo-block` (not yet published). It registers the block and
its three widgets through the usual `install(config)` entry point and resolves
every other field to an upstream Aurora widget, so it works without the
Blicca wrapper. The Python package must still be installed on the backend
for the image to render, since the React `view` reads the derived image keys
the server injects.

Things to know when using it in an Aurora frontend:

- **The image field has no label and shows no current selection.** This is
  the host image widget's own shape in both hosts. The canvas is where the
  chosen picture is visible.
- **Bring your own styling.** The stylesheet is scoped to the Blicca roots
  and does not apply in an Aurora frontend.
- The block has been verified against the registry the Aurora installers
  build, not inside a running Aurora application.

## Development

The package has a Python half and a JavaScript half. The JavaScript build
output is committed into `src/derico/blicca/promoblock/static/`; rebuild and
commit it whenever the sources in `bundle-src/src/` change.

```bash
# JavaScript: widgets, schema, edit/view, the stylesheet
cd bundle-src
pnpm install
pnpm build        # writes ../src/derico/blicca/promoblock/static/promo-block.{js,css}
pnpm test
pnpm typecheck
```

```bash
# Python, from an environment that has the test extras installed
uv run pytest
```

The JavaScript tests run the block against the real Aurora registry, built
by the upstream Aurora installers pinned as dev dependencies. Among them,
`test/seam-lockstep.test.ts` checks that the property table in this README
matches the stylesheet literally, so keep the two in step. Design decisions
are recorded in `docs/adr/`.

Every change to a GenericSetup profile XML file needs an upgrade step, even
in an alpha release. Scaffold it with `plonecli add upgrade_step`.

## License

GPL-2.0-or-later

## Author

Maik Derstappen, [derico](https://derico.de), <md@derico.de>
