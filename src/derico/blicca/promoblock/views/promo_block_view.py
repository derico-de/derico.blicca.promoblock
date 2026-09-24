"""The Promo's public renderer (``@@aurora-block-promo``).

Registered under the block add-on contract's view-name convention (§5.1):
``BlockDispatchMixin.render_block_data`` resolves
``getMultiAdapter(..., name=f"aurora-block-{block_type}")`` and stamps
``self.data`` (post-transformer) and ``self.block_type`` before calling. The
registry record's ``types`` field never influences dispatch; the view name is
the whole of it, which is why ``test_view_promo_block_view`` asserts the ZCML
name equals ``f"aurora-block-{PROMO_BLOCK_TYPE}"``.

**This is the block's other renderer, not a fallback.** The React ``view``
(``bundle-src/src/promo/PromoView.tsx``) and this template must emit the same
anatomy element for element, because ONE scope-wrapped stylesheet (ticket 11)
dresses both surfaces. Ticket 17's class table is normative for both, and
``tests/anatomy-cases.json`` — 25 hand-authored cases at the package root — is
read by this suite and the vitest one alike.

The two surfaces diverge in exactly two places, both stated:

- **Attributes.** The cross-renderer contract is the fixture's *skeleton* (the
  markup with every attribute but ``class`` removed, text kept), which is what
  lets this renderer put a real resolution ladder in its ``<img>`` and a
  resolved ``href`` on its anchors while being held to the same anatomy.
- **A dangling image reference.** Ticket 10 reads a missing ``image_url`` as
  "the picture is gone", so this renderer draws the no-image layout; the canvas
  cannot tell that apart from an image picked one second ago and previews it
  optimistically. The fixture marks that one case ``reactOnly`` with its reason.

Error policy is **inherited**: ``render_block_data`` wraps every block, logging
and emitting a ``block-render-error`` placeholder in production and propagating
in development mode. Nothing here catches anything.
"""

import re

from plone.blicca.auroraeditor.rendering import BaseBlockView
from plone.blicca.auroraeditor.rendering import image_source
from plone.blicca.auroraeditor.rendering import path_of
from plone.restapi.serializer.utils import resolve_uid

from derico.blicca.promoblock import promo_data
from derico.blicca.promoblock.picture import responsive_image


#: Template indentation, between two tags. Collapsed away — see ``__call__``.
_INDENT = re.compile(r">\s+<")


def resolve_link(value):
    """A screened link value → the URL to emit.

    Ticket 07 stores a picked link as ``../resolveuid/<UID>`` in both hosts, so
    every link field can hold a reference alongside a typed ``/path``,
    ``mailto:`` or ``https:``. Resolving the reference here beats emitting it
    for the public ``resolveuid`` view to follow: the stored form is
    *document*-relative, so it resolves against the published page's own URL
    and lands somewhere different at every depth, while ``resolve_uid`` follows
    the UID to the target's real path and ``path_of`` makes it site-relative,
    so classic UI serves it regardless of the API host the serializer stamped.

    **Resolution improves the href; it never decides the anatomy.** A reference
    whose target is gone comes back unchanged — ``resolve_uid`` returns
    "the original path, and no brain" for anything it cannot find — and is
    emitted as typed, so the action still renders and the click 404s. This is
    deliberately *unlike* ticket 10's rule for a dangling image, and the
    asymmetry has a reason: a missing picture changes the layout, so the
    renderers must agree about it, whereas a dead link changes nothing but
    where the click goes. Screening decides what renders; this decides where
    it points, and the two renderers stay in lockstep on the first.

    Scheme-safe by construction, which ``path_of`` alone is not:
    ``RESOLVEUID_RE`` cannot match a ``mailto:`` or ``tel:`` value, so those
    return unchanged and never reach ``path_of``, whose ``urlparse().path``
    would hand back a bare address with the scheme stripped.
    """
    url, _brain = resolve_uid(value)
    if url and url != value:
        return path_of(url)
    return value


class PromoBlockView(BaseBlockView):
    """Render a promo block."""

    @property
    def promo(self):
        """The stored node. ``render_block_data`` stamps it before calling."""
        return self.data or {}

    # -- the copy ------------------------------------------------------------

    @property
    def kicker(self):
        """The short line above the title. Stored as Aurora's ``head_title``."""
        return promo_data.text(self.promo.get("head_title"))

    @property
    def title(self):
        """The promo's own title — authored, never a target's."""
        return promo_data.text(self.promo.get("title"))

    @property
    def description(self):
        """Plain text: sidebar-only editing means no inline markup (ticket 03)."""
        return promo_data.text(self.promo.get("description"))

    @property
    def has_copy(self):
        """Ticket 17 rule 3: ``.promo-copy`` is never emitted empty."""
        return bool(self.kicker or self.title or self.description or self.actions)

    # -- the root ------------------------------------------------------------

    @property
    def root_class(self):
        """``.promo`` plus the effective placement, which is emitted always.

        The block owns its root; ``block block-promo has--block-width--<w>``
        and any ``has--backgroundColor--`` are the host wrapper's stamp,
        applied outside this markup by the Plate renderer's ``_block_attrs``.
        """
        return f"promo has--align--{promo_data.effective_align(self.promo)}"

    # -- the click rule ------------------------------------------------------

    @property
    def card_href(self):
        """The card link's URL, or ``''`` when the actions take the clicks."""
        card = promo_data.card_link(self.promo)
        return resolve_link(card) if card else ""

    @property
    def actions(self):
        """The rendering actions, each with its final ``href`` and class list.

        The variant is spelled into the class here rather than in the template
        so that "the classes ticket 17 chose" is one readable expression.
        """
        return [
            {
                "label": entry["label"],
                "href": resolve_link(entry["href"]),
                "css": f"promo-cta promo-cta-{entry['variant']}",
            }
            for entry in promo_data.actions(self.promo)
        ]

    # -- the picture ---------------------------------------------------------

    @property
    def image(self):
        """``{src, width, height[, srcset, sizes]}`` for the ``<img>``, or ``None``.

        In-site images get the fitting picture variant's ladder and a
        ``sizes`` matching ``blockWidth`` and the placement. ``image_source()``
        answers ``None`` for an SVG or an external URL; the screened
        ``image_url`` then carries the plain ``<img>``.
        """
        src = promo_data.image_url(self.promo)
        if not src:
            return None
        source = image_source(self.promo)
        if not source or not source.get("src"):
            return {"src": src, "width": None, "height": None}
        return responsive_image(source, self.promo, promo_data.effective_align(self.promo))

    # -- rendering -----------------------------------------------------------

    def __call__(self):
        """The template's markup, with its own indentation collapsed away.

        NO WHITESPACE-ONLY TEXT NODES, on either surface. JSX drops
        inter-element whitespace by construction; a readable ZPT template does
        not, and an inter-element newline is a real space in an inline
        formatting context — so one sheet dressing both surfaces would meet
        gaps on one and not the other. It also matters inside the Plate
        editable, which computes ``white-space: pre-wrap`` and turns every such
        newline into a line box.

        Collapsing ``>\\s+<`` is sound rather than approximate, on two
        invariants this module holds: every text value goes through
        ``promo_data.text``, so no text node begins or ends with whitespace,
        and Chameleon escapes every value, so the only bare ``<`` and ``>`` in
        the output are structural. The alternative — hanging the template's
        brackets inside the start tags — buys the same output and costs the
        readability that keeps this template comparable to ``PromoView.tsx``.
        """
        return _INDENT.sub("><", self.index().strip())
