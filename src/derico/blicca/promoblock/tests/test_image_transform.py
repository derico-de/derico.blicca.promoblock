"""The promo image serialization transformer pair.

The headline test is ``TestRoundTrip``: serialize → deserialize must return a
block byte-identical to what went in. Everything the serializer injects is
derived, and derived data is never persisted — an unpaired serializer would
write its own output back on the next save and then go stale the moment the
image is replaced, rescaled or deleted.
"""

import copy

import pytest
from plone import api
from plone.app.testing import login
from plone.app.testing import logout
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.blicca.auroraeditor.rendering import image_source
from plone.namedfile.file import NamedBlobImage
from plone.restapi.behaviors import IBlocks
from plone.restapi.blocks import iter_block_transform_handlers
from plone.restapi.interfaces import IBlockFieldDeserializationTransformer
from plone.restapi.interfaces import IBlockFieldSerializationTransformer
from zope.globalrequest import setRequest
from zope.interface import alsoProvides

from derico.blicca.promoblock.blocks import PROMO_BLOCK_TYPE
from derico.blicca.promoblock.image_transform import DERIVED_FIELDS
from derico.blicca.promoblock.interfaces import IDericoBliccaPromoblockLayer


# A valid 1x1 transparent PNG.
PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xff"
    b"\xff?\x03\x00\x08\xfc\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND"
    b"\xaeB`\x82"
)

UNKNOWN_UID = "8f2c1a9e4b7d4f0a9c3e5d6b7a8f9e01"

#: Reference case A from ticket 03: image-less, so the transformer has nothing
#: to do and must leave the node exactly alone.
CASE_A = {
    "@type": PROMO_BLOCK_TYPE,
    "head_title": "Kontakt",
    "title": "Erstgespräch vereinbaren",
    "description": "Erzählen Sie uns von Ihrem Vorhaben.",
    "cta_primary_label": "Termin vereinbaren",
    "cta_primary_link": "/kontakt",
    "cta_primary_variant": "button",
    "cta_secondary_label": "md@derico.de",
    "cta_secondary_link": "mailto:md@derico.de",
    "cta_secondary_variant": "link",
    "blockWidth": "full",
    "backgroundColor": "tinted",
}


class PromoTransformTestCase:
    """A portal holding one Image, with the add-on's layer on the request."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaPromoblockLayer)
        # iter_block_transform_handlers looks the adapters up against
        # zope.globalrequest, not against a request handed in.
        setRequest(self.request)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        login(self.portal, TEST_USER_NAME)
        self.doc = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )
        alsoProvides(self.doc, IBlocks)
        self.image = api.content.create(
            container=self.portal, type="Image", id="pic", title="A picture"
        )
        self.image.image = NamedBlobImage(data=PNG, filename="pic.png")
        self.image.reindexObject()
        yield
        setRequest(None)

    # -- the pipeline, exactly as plone.restapi runs it -------------------

    def _transform(self, block, interface):
        value = copy.deepcopy(block)
        for handler in iter_block_transform_handlers(self.doc, value, interface):
            value = handler(value)
        return value

    def serialize(self, block):
        return self._transform(block, IBlockFieldSerializationTransformer)

    def deserialize(self, block):
        return self._transform(block, IBlockFieldDeserializationTransformer)

    def promo(self, **fields):
        block = {"@type": PROMO_BLOCK_TYPE, "title": "A promo"}
        block.update(fields)
        return block


class TestResolution(PromoTransformTestCase):
    """Every stored form ticket 01 found in the wild resolves the same way."""

    def _assert_resolved(self, stored):
        value = self.serialize(self.promo(image=stored))
        assert value["image_field"] == "image"
        assert value["image_scales"]["image"][0]["base_path"] == "/plone/pic"
        assert value["image_url"].startswith("/plone/pic/@@images/image")
        # The stored value itself is NEVER rewritten. Round-trip identity
        # depends on it, and every other restapi transformer does rewrite.
        assert value["image"] == stored
        return value

    def test_blicca_writes_a_relative_resolveuid(self):
        self._assert_resolved(f"../resolveuid/{self.image.UID()}")

    def test_upstream_writes_an_absolute_id(self):
        self._assert_resolved(self.image.absolute_url())

    def test_a_site_relative_path_resolves_too(self):
        self._assert_resolved("/plone/pic")

    def test_scales_carry_the_named_sizes(self):
        value = self._assert_resolved(f"../resolveuid/{self.image.UID()}")
        assert value["image_scales"]["image"][0]["scales"] is not None

    def test_the_enriched_value_feeds_image_source(self):
        """The point of stamping base_path: Blicca's helper joins it.

        The promo's picture always lives on another object, so without
        base_path image_source() would hang the download off an ``@id`` the
        block does not have and return None.
        """
        value = self._assert_resolved(f"../resolveuid/{self.image.UID()}")
        source = image_source(value)
        assert source is not None
        assert source["src"].startswith("/plone/pic/@@images/image")
        assert source["width"] == 1
        assert source["height"] == 1


class TestAnonymousResolution(PromoTransformTestCase):
    """The public renderer runs as a visitor, and that path really differs.

    ``resolve_uid`` hands back a brain only because
    ``DexterityObjectPrimaryFieldTarget`` returns ``None`` for an Image: its
    primary field is ``INamedBlobImageField``, which descends from
    ``INamedImageField`` and NOT from ``INamedFileField``, so restapi's
    ``PrimaryFileFieldTarget`` does not apply. Were it ever to apply,
    ``resolve_uid`` would return ``(download_url, None)`` and every promo
    would silently lose its scales.

    That adapter short-circuits on ``ModifyPortalContent``, so it is inert
    for anyone who can edit — which is everyone in every other test here.
    Only a visitor exercises it. Without this test the failure would ship
    green and break for the public alone.
    """

    def test_scales_still_resolve_for_a_visitor(self):
        stored = f"../resolveuid/{self.image.UID()}"
        logout()
        value = self.serialize(self.promo(image=stored))
        assert value["image_field"] == "image"
        assert value["image_scales"]["image"][0]["base_path"] == "/plone/pic"
        assert value["image_url"].startswith("/plone/pic/@@images/image")


class TestValuesThatYieldNoScales(PromoTransformTestCase):
    def test_an_external_url_is_kept_whole(self):
        """path_of() would strip the host off a genuinely external image."""
        external = "https://example.com/logo.png"
        value = self.serialize(self.promo(image=external))
        assert value["image_url"] == external
        assert "image_scales" not in value
        assert "image_field" not in value

    def test_a_dangling_reference_yields_nothing_at_all(self):
        """A deleted image draws the no-image layout, not a guaranteed 404."""
        value = self.serialize(self.promo(image=f"../resolveuid/{UNKNOWN_UID}"))
        for key in DERIVED_FIELDS:
            assert key not in value

    def test_a_deleted_target_yields_nothing_at_all(self):
        stored = f"../resolveuid/{self.image.UID()}"
        api.content.delete(obj=self.image)
        value = self.serialize(self.promo(image=stored))
        for key in DERIVED_FIELDS:
            assert key not in value

    def test_referenced_content_carrying_no_image_yields_nothing(self):
        """``base`` would be a page URL, not a picture."""
        value = self.serialize(self.promo(image=f"../resolveuid/{self.doc.UID()}"))
        for key in DERIVED_FIELDS:
            assert key not in value

    @pytest.mark.parametrize("empty", [None, "", "   ", []])
    def test_an_unset_image_is_left_alone(self, empty):
        value = self.serialize(self.promo(image=empty))
        assert value == self.promo(image=empty)

    def test_a_block_without_an_image_key_is_left_alone(self):
        assert self.serialize(CASE_A) == CASE_A


class TestLegacyStoredShapes(PromoTransformTestCase):
    """Upstream's normalizeImageValue reads these; so do we. We never write them."""

    def test_a_dict_carrying_an_id(self):
        value = self.serialize(self.promo(image={"@id": self.image.absolute_url()}))
        assert value["image_url"].startswith("/plone/pic/@@images/image")
        assert value["image"] == {"@id": self.image.absolute_url()}

    def test_a_list_of_one_dict(self):
        value = self.serialize(self.promo(image=[{"@id": self.image.absolute_url()}]))
        assert value["image_url"].startswith("/plone/pic/@@images/image")


class TestStaleDerivedData(PromoTransformTestCase):
    """Strip first, derive second — a node written before this pair existed."""

    def test_stale_keys_are_dropped_when_the_image_is_gone(self):
        stale = self.promo(
            image=None,
            image_scales={"image": [{"download": "@@images/image-old.png"}]},
            image_field="image",
            image_url="/plone/gone/@@images/image-old.png",
        )
        value = self.serialize(stale)
        for key in DERIVED_FIELDS:
            assert key not in value

    def test_stale_keys_are_replaced_when_the_image_resolves(self):
        stale = self.promo(
            image=f"../resolveuid/{self.image.UID()}",
            image_scales={"image": [{"download": "@@images/image-old.png"}]},
            image_url="/plone/gone/@@images/image-old.png",
        )
        value = self.serialize(stale)
        assert "old" not in value["image_url"]
        assert value["image_scales"]["image"][0]["base_path"] == "/plone/pic"


class TestDispatch(PromoTransformTestCase):
    """The pair claims ``promo`` and nothing else."""

    def _ours(self, block, interface):
        return [
            handler
            for handler in iter_block_transform_handlers(self.doc, block, interface)
            if type(handler).__module__.startswith("derico.blicca.promoblock")
        ]

    def test_both_directions_are_registered_for_promo(self):
        block = self.promo()
        assert len(self._ours(block, IBlockFieldSerializationTransformer)) == 1
        assert len(self._ours(block, IBlockFieldDeserializationTransformer)) == 1

    def test_no_other_block_type_is_touched(self):
        for block_type in ("teaser", "image", "listing", "text"):
            block = {"@type": block_type}
            assert self._ours(block, IBlockFieldSerializationTransformer) == []
            assert self._ours(block, IBlockFieldDeserializationTransformer) == []

    def test_the_site_root_is_served_too(self):
        """A footer stored on the root renders on every page."""
        block = self.promo(image=f"../resolveuid/{self.image.UID()}")
        value = copy.deepcopy(block)
        for handler in iter_block_transform_handlers(
            self.portal, value, IBlockFieldSerializationTransformer
        ):
            value = handler(value)
        assert value["image_field"] == "image"


class TestDeserializer(PromoTransformTestCase):
    def test_every_derived_key_is_stripped(self):
        enriched = self.promo(
            image="/plone/pic",
            image_scales={"image": [{"download": "x"}]},
            image_field="image",
            image_url="/plone/pic/@@images/image",
        )
        value = self.deserialize(enriched)
        for key in DERIVED_FIELDS:
            assert key not in value
        assert value["image"] == "/plone/pic"


class TestRoundTrip(PromoTransformTestCase):
    """serialize → deserialize is the identity. The pair's whole point."""

    def _assert_round_trips(self, block):
        original = copy.deepcopy(block)
        persisted = self.deserialize(self.serialize(block))
        assert persisted == original
        # and the caller's own dict was never mutated on the way through
        assert block == original

    def test_reference_case_a_has_no_image(self):
        self._assert_round_trips(CASE_A)

    def test_reference_case_b_carries_a_picked_image(self):
        self._assert_round_trips({
            "@type": PROMO_BLOCK_TYPE,
            "head_title": "Open Source",
            "title": "Plone für langlebige Anwendungen",
            "description": "Ein CMS, das seit über zwanzig Jahren migrierbar bleibt.",
            "image": f"../resolveuid/{self.image.UID()}",
            "align": "left",
            "cta_primary_label": "Mehr erfahren",
            "cta_primary_link": "/leistungen/plone",
            "cta_primary_variant": "button",
            "cta_secondary_variant": "button",
            "blockWidth": "default",
        })

    def test_an_absolute_id_survives_as_an_absolute_id(self):
        """The stored path differs by host and must stay that way."""
        self._assert_round_trips(self.promo(image=self.image.absolute_url()))

    def test_an_external_url_survives(self):
        self._assert_round_trips(self.promo(image="https://example.com/logo.png"))

    def test_a_dangling_reference_survives(self):
        self._assert_round_trips(self.promo(image=f"../resolveuid/{UNKNOWN_UID}"))
