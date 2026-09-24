"""The promo image's responsive ladder, built from Plone's picture variants.

The variant's ``srcset`` and a ``sizes`` derived from ``blockWidth`` and the
placement are folded onto the ``<img>`` rather than a ``<source>``, so the
anatomy both renderers share stays ``picture > img``.
"""

from plone.namedfile.picture import get_picture_variants
from plone.namedfile.picture import Img2PictureTag


#: Candidate variants; ``fullwidth`` ships with plone.blicca.auroraeditor.
VARIANTS = ("small", "medium", "large", "fullwidth")

#: blockWidth -> its container's max width in px (``None``: the viewport).
#: Mirrors the ``--*-container-width`` defaults behind ``--block-width``.
CONTAINER_WIDTHS = {
    "narrow": 620,
    "default": 940,
    "layout": 1440,
    "full": None,
}
DEFAULT_BLOCK_WIDTH = "default"

#: ``--promo-gap``'s default, between image and copy in a two-column promo.
GAP = "2rem"
GAP_PX = 32

#: The two columns collapse below a 34rem promo; the page gutters sit on top
#: of that, so switch a little later and over-fetch rather than under-fetch.
SIDE_BY_SIDE_FROM = "40rem"


def container_width(data):
    """The px cap of the block's box, or ``None`` when it spans the viewport."""
    width = (data or {}).get("blockWidth")
    if width not in CONTAINER_WIDTHS:
        width = DEFAULT_BLOCK_WIDTH
    return CONTAINER_WIDTHS[width]


def sizes(data, align):
    """The ``sizes`` attribute for the promo image."""
    cap = container_width(data)
    if align not in ("left", "right"):
        return f"(min-width: {cap}px) {cap}px, 100vw" if cap else "100vw"
    half = f"calc((100vw - {GAP}) / 2)"
    rules = [f"(min-width: {SIDE_BY_SIDE_FROM}) {half}", "100vw"]
    if cap:
        rules.insert(0, f"(min-width: {cap}px) calc(({cap}px - {GAP}) / 2)")
    return ", ".join(rules)


def rendered_width(data, align):
    """The widest the image gets, in px; ``None`` when unbounded."""
    cap = container_width(data)
    if cap is None or align not in ("left", "right"):
        return cap
    return (cap - GAP_PX) // 2


def variant_for(data, align, variants=None):
    """The smallest variant whose target scale covers the rendered width."""
    if variants is None:
        variants = get_picture_variants()
    tag = Img2PictureTag()
    candidates = []
    for name in VARIANTS:
        sourceset = (variants.get(name) or {}).get("sourceset")
        if sourceset:
            width = tag.get_scale_width(sourceset[-1]["scale"]) or 0
            candidates.append((width, name))
    if not candidates:
        return None
    candidates.sort()
    needed = rendered_width(data, align)
    if needed is not None:
        for width, name in candidates:
            if width >= needed:
                return name
    return candidates[-1][1]


def responsive_image(source, data, align):
    """``source`` plus ``srcset``/``sizes`` from the fitting picture variant.

    ``source`` is ``image_source()``'s ``{src, width, height}``; it comes back
    unchanged when no variant is available.
    """
    variants = get_picture_variants()
    name = variant_for(data, align, variants)
    if name is None:
        return source
    picture = Img2PictureTag().create_picture_tag(
        variants[name]["sourceset"], {"src": source["src"]}, lazy=False
    )
    ladder = picture.find_all("source")[-1]
    return dict(
        source,
        src=picture.find("img")["src"],
        srcset=", ".join(ladder["srcset"].split(",\n")),
        sizes=sizes(data, align),
    )
