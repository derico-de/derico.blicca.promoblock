"""Reference case B — a picture beside the copy, through the whole pipeline.

Ticket 14. Case A (``test_reference_case_band.py``) validated the image-less
band; a block validated only against that would ship a broken row, because the
two cases share almost no layout and — more to the point here — almost no code
path. This file is where the *image* half of the block is exercised whole.

Its range is what makes it worth having. Everywhere else the two halves are
tested apart:

- ``test_image_transform.py`` runs the transformer pair against a real Image
  and stops at ``image_source()``. It never renders.
- ``test_view_promo_block_view.py`` renders every anatomy case, but hand-stamps
  ``image_url`` into ``data``. It never resolves anything.

So the sentence "an author picks a picture and the page shows it" is asserted
in neither. Here a **real** ``Image`` is created, referenced the way ticket 07
stores a picked value, and rendered through ``render_blocks`` — restapi's
serialization transforms, ``PlateRenderer``'s block anatomy and
``@@aurora-block-promo`` in one call — so the ``<img src>`` on the page is one
the pipeline derived rather than one a test wrote down.

Four things only this composition reaches:

1. **A stored reference becoming a real ``src``**, with the intrinsic
   ``width``/``height`` that only appear when scales resolved (ticket 09).
2. **The placements with a picture present.** Case A is ``center`` whatever was
   stored, because ticket 17 rule 1 reports the *effective* placement and an
   image-less promo has none. Only a case with a picture can show ``left``,
   ``right`` and ``center`` surviving as authored.
3. **The whole-card click with a picture.** Case A cannot reach it at all — it
   has two actions, and the click rule hands those the clicks.
4. **A deleted picture degrading the layout**, which is ticket 10's rule and
   ticket 17's rule 1 composed: the ``<picture>`` goes, and the placement falls
   back to ``center`` in the same render. The pieces are unit-tested; that they
   move together is not, and it is what ticket 11 flagged as the case where the
   two surfaces are most likely to diverge.

The authored node is the fixture's ``reference-case-image-beside-the-copy``,
read rather than restated, so this file cannot quietly author a different
promo than the two anatomy suites are held to.
"""

import copy
import json
from pathlib import Path

import pytest
from plone import api
from plone.app.testing import login
from plone.app.testing import logout
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.app.testing import TEST_USER_NAME
from plone.blicca.auroraeditor import SOMERSAULT_BLOCK_ID
from plone.blicca.auroraeditor import SOMERSAULT_BLOCK_TYPE
from plone.blicca.auroraeditor.browser.rendering.blocks_view import render_blocks
from plone.blicca.auroraeditor.browser.rendering.scales import path_of
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

from .test_reference_case_band import band_node
from .test_view_promo_block_view import skeleton


# A valid 1x1 transparent PNG — the same bytes ``test_image_transform`` uses.
PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xff"
    b"\xff?\x03\x00\x08\xfc\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND"
    b"\xaeB`\x82"
)

#: The same picture, 2x1 instead of 1x1 — a stand-in for an author replacing or
#: rescaling the image behind a promo nobody edited.
_WIDER_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\xf4\"\x7f\x8a\x00\x00\x00\x0eIDATx\x9cc\xf8\xcf"
    b"\xc0\xf0\x1f\x84\x01\x11\xf7\x03\xfd\xe3\xc5\xf5\xef\x00\x00\x00"
    b"\x00IEND\xaeB`\x82"
)

FIXTURE = Path(__file__).resolve().parents[5] / "tests" / "anatomy-cases.json"

CASE_NAME = "reference-case-image-beside-the-copy"

CASES = {
    case["name"]: case
    for case in json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]
}


class ReferenceCaseTestCase:
    """A page, a picture to put on it, and a target for the card link."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        alsoProvides(self.request, IDericoBliccaPromoblockLayer)
        # The transform handlers are looked up against zope.globalrequest,
        # not against a request handed in.
        setRequest(self.request)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.image = api.content.create(
            container=self.portal, type="Image", id="pic", title="Ein Bild"
        )
        self.image.image = NamedBlobImage(data=PNG, filename="pic.png")
        self.image.reindexObject()
        self.target = api.content.create(
            container=self.portal, type="Document", id="leistungen", title="Leistungen"
        )
        self.page = api.content.create(
            container=self.portal, type="Document", id="promo-page", title="Startseite"
        )
        alsoProvides(self.page, IBlocks)
        yield
        setRequest(None)

    # -- the authored node ---------------------------------------------------

    def stored_data(self, **overrides):
        """The fixture's case B as it would sit **on disk**.

        Two edits, both of them the point. ``image`` becomes a reference to the
        real picture, in the ``../resolveuid/<UID>`` form ticket 07 stores when
        an author picks through the Browse disclosure; and every derived key is
        stripped, because ticket 10's deserializer strips them on every save —
        so a stored node carrying ``image_url`` is one no save ever produced.
        The transformer has to put it back, which is what this file watches.
        """
        data = copy.deepcopy(CASES[CASE_NAME]["data"])
        for key in DERIVED_FIELDS:
            data.pop(key, None)
        data["image"] = f"../resolveuid/{self.image.UID()}"
        data.update(overrides)
        return data

    def promo_node(self, **overrides):
        node = {
            "type": "ploneBlock",
            "@type": PROMO_BLOCK_TYPE,
            "children": [{"text": ""}],
        }
        node.update(self.stored_data(**overrides))
        return node

    def render(self, *nodes):
        """The markup a published page carrying these promos emits."""
        blocks = {
            SOMERSAULT_BLOCK_ID: {
                "@type": SOMERSAULT_BLOCK_TYPE,
                "value": list(nodes),
            }
        }
        return render_blocks(
            self.page,
            self.request,
            blocks,
            {"items": [SOMERSAULT_BLOCK_ID]},
        )

    def promo_markup(self, html):
        """Just our own markup, with the host's wrapper peeled off."""
        opening = html.index(">") + 1
        assert html.startswith("<div "), html[:120]
        assert html.endswith("</div>"), html[-40:]
        return html[opening:-len("</div>")]


class TestTheFixtureItReads(ReferenceCaseTestCase):
    """The guard a fixture-driven suite needs before any of its assertions."""

    def test_the_case_is_where_this_file_thinks_it_is(self):
        assert FIXTURE.is_file(), FIXTURE
        assert CASE_NAME in CASES, sorted(CASES)
        data = CASES[CASE_NAME]["data"]
        # The four properties that make this reference case B and not another
        # image case: a picture, a placement, a card link, and NO action label
        # to take the click away from it.
        assert data["align"] == "left"
        assert data["image"].startswith("../resolveuid/")
        assert data["card_link"]
        assert not any(key.endswith("_label") for key in data)

    def test_a_stored_node_carries_no_derived_key(self):
        # The premise of every test below: the pipeline derives the picture,
        # this file does not hand it one.
        stored = self.stored_data()
        for key in DERIVED_FIELDS:
            assert key not in stored


class TestThePictureThroughThePipeline(ReferenceCaseTestCase):
    """A picked reference on disk, a real ``<img src>`` on the page."""

    def test_the_reference_becomes_a_scale_url(self):
        markup = self.render(self.promo_node())
        assert '<picture class="promo-image">' in markup
        assert 'src="/plone/pic/@@images/image' in markup

    def test_the_stored_form_never_reaches_the_visitor(self):
        # `../resolveuid/<UID>` is DOCUMENT-relative: emitted as stored it
        # would resolve against the published page's own URL and land
        # somewhere different at every depth.
        assert "resolveuid" not in self.render(self.promo_node())

    def test_scales_bring_the_intrinsic_size_the_canvas_cannot_have(self):
        # Ticket 09: `width`/`height` appear only when scales resolved, and
        # the editor's canvas never has them — which is why ticket 11 sizes
        # `.promo-image` from the sheet instead of from these attributes.
        markup = self.render(self.promo_node())
        assert 'width="1"' in markup
        assert 'height="1"' in markup

    def test_still_no_srcset(self):
        # Ticket 08's reason holds identically on the server: `w` descriptors
        # without a `sizes` policy a generic block cannot know would over-fetch.
        assert "srcset" not in self.render(self.promo_node())

    def test_the_anatomy_is_the_fixture_s(self):
        # The attributes differ by construction — the fixture's `src` is a
        # written-down path and this one was derived — so the claim is the
        # SKELETON, which is exactly the cross-renderer contract the two
        # anatomy suites use. What it adds here: the real pipeline produces
        # the same anatomy the fixture fixes, rather than a similar one.
        markup = self.promo_markup(self.render(self.promo_node()))
        assert skeleton(markup) == skeleton(CASES[CASE_NAME]["html"])


class TestThePlacements(ReferenceCaseTestCase):
    """The row case A cannot reach: a placement that survives as authored."""

    @pytest.mark.parametrize("align", ["left", "right", "center"])
    def test_the_stored_placement_is_the_effective_one(self, align):
        markup = self.render(self.promo_node(align=align))
        assert f'class="promo has--align--{align}"' in markup
        assert markup.count("has--align--") == 1
        assert '<picture class="promo-image">' in markup

    def test_an_unknown_placement_falls_back_rather_than_leaking(self):
        # A value no widget offers — a hand-edited node, or a value from a
        # future version of the block.
        markup = self.render(self.promo_node(align="top"))
        assert 'class="promo has--align--center"' in markup


class TestTheWholeCardIsTheClick(ReferenceCaseTestCase):
    """Reference case B's other half: both labels empty, card link set.

    The click rule itself is pinned at the renderer in
    ``test_view_promo_block_view.TestTheClickRule``, over all six label/link
    combinations. What only this case adds is the rule holding **around a
    picture**, with a picked target resolved by the same pass that resolved
    the image, and the promo still being exactly one interactive element.
    """

    def test_the_card_link_wraps_the_whole_promo(self):
        markup = self.promo_markup(self.render(self.promo_node()))
        assert markup.startswith('<a class="promo-cardlink" ')
        assert markup.endswith("</a>")
        assert '<div class="promo has--align--left">' in markup

    def test_a_picked_card_link_resolves_beside_the_picture(self):
        # One serialization pass, two references of different kinds: the image
        # is resolved by ticket 10's transformer into `image_url`, the link by
        # the renderer's own `resolve_link`. Neither is asserted to touch the
        # other anywhere else.
        uid = api.content.get_uuid(self.target)
        markup = self.render(self.promo_node(card_link=f"../resolveuid/{uid}"))
        assert f'href="{path_of(self.target.absolute_url())}"' in markup
        assert 'src="/plone/pic/@@images/image' in markup
        assert "resolveuid" not in markup

    def test_the_promo_is_exactly_one_interactive_element(self):
        # Ticket 03's Q8: never an anchor inside an anchor. With a picture
        # present the wrapper spans it too, which is the whole point of the
        # card link and the reason it cannot coexist with an action.
        assert self.render(self.promo_node()).count("<a ") == 1

    def test_one_action_label_makes_the_card_inert(self):
        markup = self.render(
            self.promo_node(
                cta_primary_label="Mehr erfahren",
                cta_primary_link="/leistungen",
            )
        )
        assert "promo-cardlink" not in markup
        assert '<a class="promo-cta promo-cta-button" href="/leistungen">' in markup
        assert markup.count("<a ") == 1

    def test_the_hidden_card_link_survives_on_disk_and_comes_back(self):
        # The sidebar withdraws the field while a label is typed, but a value
        # set earlier is never cleared — so clearing the label must bring the
        # whole-card click back, from the same stored node.
        node = self.promo_node(cta_primary_label="Mehr erfahren")
        assert node["card_link"]
        assert "promo-cardlink" not in self.render(node)
        node["cta_primary_label"] = ""
        assert "promo-cardlink" in self.render(node)


class TestThePictureThatWentAway(ReferenceCaseTestCase):
    """Ticket 10's rule and ticket 17's rule 1, moving together.

    Each is unit-tested alone: the transformer emits no derived key for a
    target that is gone, and the renderer reports the *effective* placement.
    Composed they mean something neither states — **a deleted picture changes
    the layout**, from a two-track row to the centred single column, in the
    same render and without the author touching the node. Ticket 11 named this
    the case where the two surfaces are most likely to look different even
    though the anatomy agrees, so it is worth having the anatomy pinned.
    """

    def test_before_and_after_the_target_is_deleted(self):
        node = self.promo_node()
        before = self.render(node)
        assert '<picture class="promo-image">' in before
        assert 'class="promo has--align--left"' in before

        api.content.delete(obj=self.image)

        after = self.render(node)
        assert "promo-image" not in after
        assert "<picture" not in after
        # Not merely "no picture": the placement falls back too, because a
        # promo with nothing to place beside the copy has no placement.
        assert 'class="promo has--align--center"' in after
        # And the rest of the promo is untouched — a dead reference is not an
        # error, it is one fewer element.
        assert '<h2 class="promo-title">' in after
        assert 'class="promo-cardlink"' in after

    def test_the_no_image_layout_is_the_one_the_fixture_fixes(self):
        # The degraded shape is not improvised here: it is the same anatomy as
        # the fixture's `card-link-on-an-empty-promo` family — copy and card
        # link, centred, no picture.
        api.content.delete(obj=self.image)
        markup = self.promo_markup(self.render(self.promo_node()))
        assert "<picture" not in skeleton(markup)
        assert skeleton(markup).count('class="promo-copy"') == 1


class TestTheVisitorsPromo(ReferenceCaseTestCase):
    """Published, anonymous — the surface the promo actually lives on.

    Two permission-sensitive lookups run in one render here, and they are not
    the same lookup: ``resolve_uid`` reads the catalog for the card link, and
    ticket 10's transformer resolves the image through a second path whose
    anonymous branch exists only because restapi's ``PrimaryFileFieldTarget``
    misses an Image by a hair (``INamedBlobImageField`` is not a
    ``INamedFileField``). ``test_image_transform`` pins that adapter alone;
    what this adds is that the whole page survives a logout.
    """

    def test_an_anonymous_visitor_gets_the_same_page(self):
        uid = api.content.get_uuid(self.target)
        node = self.promo_node(card_link=f"../resolveuid/{uid}")
        as_editor = self.render(node)
        logout()
        try:
            assert api.user.has_permission("View", obj=self.target)
            as_visitor = self.render(node)
        finally:
            login(self.portal, TEST_USER_NAME)
        assert as_visitor == as_editor
        assert 'src="/plone/pic/@@images/image' in as_visitor


class TestTheSaveReloadRoundTrip(ReferenceCaseTestCase):
    """What an author's save actually does to the node, at page range.

    ``test_image_transform.TestRoundTrip`` proves serialize → deserialize is
    the identity on the block dict. This says what that identity BUYS: a promo
    saved and reloaded renders the same page, and nothing derived was ever
    written to disk — so the picture on the page is always the picture as it is
    now, not as it was when the author last pressed save.
    """

    def _saved(self, node):
        """The node as it comes back out of a save/reload cycle."""
        value = copy.deepcopy(node)
        for interface in (
            IBlockFieldSerializationTransformer,
            IBlockFieldDeserializationTransformer,
        ):
            for handler in iter_block_transform_handlers(self.page, value, interface):
                value = handler(value)
        return value

    def test_the_reloaded_promo_renders_the_same_page(self):
        node = self.promo_node()
        assert self.render(self._saved(node)) == self.render(node)

    def test_the_save_persists_no_derived_key(self):
        for key in DERIVED_FIELDS:
            assert key not in self._saved(self.promo_node())

    def test_a_rescaled_picture_is_picked_up_without_a_save(self):
        # The consequence, stated as a test rather than as a comment: replace
        # the image's data and the page follows, because the `src` was derived
        # at render time and not at save time.
        node = self.promo_node()
        assert 'width="1"' in self.render(node)
        self.image.image = NamedBlobImage(data=_WIDER_PNG, filename="pic.png")
        self.image.reindexObject()
        assert 'width="2"' in self.render(node)


class TestTheTwoReferenceCasesTogether(ReferenceCaseTestCase):
    """Both promos on one page — which is how the live probe page is built.

    Not decoration: the two cases stress opposite branches of the same
    renderer (picture/no picture, card link/actions, ``left``/``center``), and
    a renderer holding per-request state would show it here and nowhere else.
    """

    def test_neither_case_leaks_into_the_other(self):
        markup = self.render(band_node(), self.promo_node())
        assert markup.count('class="promo has--align--') == 2
        assert markup.count("has--align--center") == 1
        assert markup.count("has--align--left") == 1
        assert markup.count('<picture class="promo-image">') == 1
        assert markup.count("promo-cardlink") == 1
        assert markup.count("promo-cta ") == 2
