"""Promo block image serialization transformers.

The Promo stores its image as a bare reference string and nothing else.
Ticket 01 established that **neither host persists** ``image_scales`` or
``image_field`` by any route: ``Field.tsx`` passes ``onChange`` a single
argument and drops the widget's ``extras``, and Blicca's node-patching side
channel gates on ``@type === 'image'``, so it never fires for ``promo``. This
pair is therefore the block's *only* source of scales, not merely its
preferred one — and derived data is never persisted (block add-on contract
§5.3), so the serializer has a deserializer twin that strips every injected
key again on save.

Registered as ``(context, request)`` subscription adapters providing
``IBlockFieldSerializationTransformer`` / ``IBlockFieldDeserializationTransformer``,
for both ``IBlocks`` content and the site root — a footer stored on the root
renders on every page. plone.restapi's ``NestedBlocksVisitor`` recurses into
the somersault value tree, so a promo nested in a Plate tree is transformed
too, on restapi GET and on classic rendering alike. That is what keeps the
editor canvas and the public renderer seeing identical data.

Only the image is transformed. The three link fields are not: they hold a
bare string both surfaces can read without a round trip, and resolving them
would only add more keys to strip for no gain.

Worked example: ``plone.blicca.auroraeditor``'s ``listing_transform.py``.
"""

import logging

from plone.base.interfaces import IPloneSiteRoot
from plone.blicca.auroraeditor.rendering import path_of
from plone.restapi.behaviors import IBlocks
from plone.restapi.deserializer.utils import path2uid
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from plone.restapi.serializer.converters import json_compatible
from plone.restapi.serializer.utils import resolve_uid
from plone.restapi.serializer.utils import RESOLVEUID_RE
from zope.component import adapter
from zope.interface import implementer

from derico.blicca.promoblock.blocks import PROMO_BLOCK_TYPE
from derico.blicca.promoblock.interfaces import IDericoBliccaPromoblockLayer


logger = logging.getLogger(__name__)

#: Every key this pair injects. The serializer strips these before deriving
#: them, and the deserializer strips them before the node is written — so the
#: two directions are spelled once and cannot drift apart. plone.restapi's own
#: generic deserializer already pops ``image_scales`` from every block dict,
#: but it knows nothing of the other two; do not rely on it.
DERIVED_FIELDS = ("image_scales", "image_field", "image_url")


def stored_image(value):
    """The stored image reference as a string, reading the legacy shapes too.

    Both hosts only ever *write* a bare string or ``null`` (ticket 01), but
    upstream's own ``normalizeImageValue`` also *reads* ``{'@id': ...}`` and
    ``[{'@id': ...}]`` as a Volto-era defence. Accept what it accepts; we
    never write those shapes back.
    """
    if isinstance(value, (list, tuple)):
        value = value[0] if value else None
    if isinstance(value, dict):
        value = value.get("@id") or value.get("url")
    if not isinstance(value, str):
        return ""
    return value.strip()


def resolve_image(context, stored):
    """Resolve a stored image value to ``(url, brain)``.

    Handles every form ticket 01 found in the wild: Blicca's relative
    ``../resolveuid/<UID>``, upstream's absolute ``@id``, a site-relative
    path, and the free-text external URL the native host's image widget
    accepts. ``brain`` is ``None`` whenever the value does not name content
    in this site.

    A **reference that resolves to nothing** — the target was deleted —
    yields ``("", None)`` rather than the raw ``../resolveuid/…`` string, so
    the caller can tell "the author typed a URL" from "the picture is gone"
    and draw the no-image layout instead of a guaranteed 404.
    """
    if RESOLVEUID_RE.match(stored) is not None:
        candidate, reference = stored, True
    else:
        # An absolute @id or a /path becomes a resolveuid reference, following
        # renames through the redirection storage on the way; an external URL
        # comes back unchanged, so resolve_uid then hands it straight through.
        candidate = path2uid(context=context, link=stored)
        reference = RESOLVEUID_RE.match(candidate) is not None
    url, brain = resolve_uid(candidate)
    if brain is None and reference:
        return "", None
    return url, brain


def derived_image_fields(context, stored):
    """The derived keys for one stored image value; ``{}`` when there are none."""
    url, brain = resolve_image(context, stored)
    if brain is None:
        # An external URL, or an absolute one naming nothing here. No scales
        # exist, and the URL is emitted WHOLE — path_of() would strip the host
        # off a genuinely external image. An empty url is a dangling reference.
        return {"image_url": url} if url else {}

    base = path_of(brain.getURL())
    scales = json_compatible(getattr(brain, "image_scales", None)) or {}
    field = "image" if "image" in scales else next(iter(scales), None)
    entries = (scales.get(field) or []) if field else []
    if not entries:
        # Referenced content carrying no image at all. ``base`` is the object's
        # own URL, which is a page and not a picture, so emit nothing and let
        # the renderer draw the no-image layout.
        return {}

    for entry in entries:
        # Where image_source() and image_model() look for the URL prefix when
        # the picture lives on another object — which for a promo it always
        # does, the block being authored rather than referential. plone.volto's
        # preview_link behaviour stamps the key the same way; the full site
        # path (not the portal-relative one) is the form Blicca's helpers join.
        entry.setdefault("base_path", base)

    download = entries[0].get("download")
    return {
        "image_scales": scales,
        "image_field": field,
        # Always directly usable as an <img src>: the original-size download
        # where there is one, so the plain-<img> fallback (SVGs, which
        # image_source() declines to scale) has somewhere to point.
        "image_url": f"{base}/{download}" if download else base,
    }


class PromoImageSerializerBase:
    """Resolve the promo's image reference into renderable scales."""

    order = 200
    block_type = PROMO_BLOCK_TYPE

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_FIELDS:
            # Strip first, derive second. Anything already on disk is stale by
            # definition, so a node written before this pair existed cannot
            # leak an old scale set past an image that has since been cleared.
            value.pop(key, None)
        stored = stored_image(value.get("image"))
        if not stored:
            return value
        try:
            value.update(derived_image_fields(self.context, stored))
        except Exception:
            # One unresolvable image must not break the whole page's
            # serialization — listing_transform's rule for a broken
            # querystring. The block renders its no-image layout instead.
            logger.exception("Could not resolve promo image %r", stored)
        return value


@implementer(IBlockFieldSerializationTransformer)
@adapter(IBlocks, IDericoBliccaPromoblockLayer)
class PromoImageSerializer(PromoImageSerializerBase):
    """Resolve the promo image for content with the IBlocks behavior."""


@implementer(IBlockFieldSerializationTransformer)
@adapter(IPloneSiteRoot, IDericoBliccaPromoblockLayer)
class PromoImageSerializerRoot(PromoImageSerializerBase):
    """Resolve the promo image on the site root."""


class PromoImageDeserializerBase:
    """Strip the derived image keys before the block is persisted.

    Unpaired, the serializer's output would be written back on the next save
    and then go stale the moment the image is replaced, rescaled or deleted.
    """

    order = 200
    block_type = PROMO_BLOCK_TYPE

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, value):
        for key in DERIVED_FIELDS:
            value.pop(key, None)
        return value


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IBlocks, IDericoBliccaPromoblockLayer)
class PromoImageDeserializer(PromoImageDeserializerBase):
    """Strip the derived image keys for content with the IBlocks behavior."""


@implementer(IBlockFieldDeserializationTransformer)
@adapter(IPloneSiteRoot, IDericoBliccaPromoblockLayer)
class PromoImageDeserializerRoot(PromoImageDeserializerBase):
    """Strip the derived image keys on the site root."""
