"""Reference case A — derico.de's contact band, authored as a Promo.

Ticket 13. **The band is not migrated.** It stays a chrome pagelet
(``plonetheme.derico/templates/contact.pt``), deliberately identical on every
page, and authoring it per page would lose it the first time someone forgot.
What this file proves is that the block *could* express it, which is evidence
that the block's shape is right — and evidence is all a reference case ever
is. Had reproducing the band needed an option the block does not have, the
answer would have been the theme seam or a deliberate new option, never a
derico-shaped special case in the block.

The band's stored node is in the shared fixture as
``reference-case-the-contact-band``, so both renderers are already held to the
markup it produces, exactly and as a skeleton, and
``bundle-src/test/promo-schema.test.ts`` holds it to being *authorable* — every
field it carries is one the sidebar offers. **This file asserts what neither of
those can: what the host does around it, on the public page.**

Three things only this case reaches:

1. **The whole publishing pipeline in one render.** ``render_blocks`` is the
   promised API (contract §5.2) that ``@@aurora-blocks-view`` calls: stored
   JSON → restapi serialization transforms → ``PlateRenderer``'s block anatomy
   → ``@@aurora-block-promo``. Every other Python test here calls the renderer
   directly with a hand-stamped ``data``, so the wrapper — ``block block-promo
   has--block-width--full has--backgroundColor--dark`` and the custom
   properties that paint the band — is asserted nowhere else, and neither is
   the fact that our markup is the wrapper's only child.
2. **The band's two links together, in one render.** They are not alike: an
   internal target the author picked (stored ``../resolveuid/<UID>``, resolved
   server-side) beside a typed ``mailto:`` that must survive exactly as typed,
   which is where ``path_of()``'s scheme-stripping would bite. The hazard
   itself, and every single-link rule, is pinned at the renderer in
   ``test_view_promo_block_view.TestLinks``; what the band adds is that the
   code path which rewrote one link left the other alone.
3. **The visitor's view.** ``resolve_uid`` reads the catalog, so the button's
   href is permission-sensitive in a way nothing else in the block is. The
   band renders identically logged out, and that is asserted rather than
   assumed.
"""

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
from plone.restapi.behaviors import IBlocks
from zope.interface import alsoProvides

from derico.blicca.promoblock.blocks import PROMO_BLOCK_TYPE
from derico.blicca.promoblock.interfaces import IDericoBliccaPromoblockLayer


#: The same file both renderers' anatomy suites read, and the same case
#: `promo-schema.test.ts` proves authorable. Read rather than restated: a band
#: spelled twice would drift, and the point of a reference case is that ONE
#: authored node travels through every surface.
FIXTURE = Path(__file__).resolve().parents[5] / "tests" / "anatomy-cases.json"

CASE_NAME = "reference-case-the-contact-band"

CASES = {
    case["name"]: case
    for case in json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]
}


def band_node(**overrides):
    """The band as a ``ploneBlock`` node in a Plate tree.

    ``children`` is the void node's mandatory empty text child; ``@type`` is
    what the dispatcher keys on. Everything else is the authored data, taken
    from the fixture so this file cannot quietly author a different band.
    """
    node = {
        "type": "ploneBlock",
        "@type": PROMO_BLOCK_TYPE,
        "children": [{"text": ""}],
    }
    node.update(CASES[CASE_NAME]["data"])
    node.update(overrides)
    return node


class ReferenceCaseTestCase:
    """A page carrying the band, and the contact page its button points at."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.request = integration["request"]
        # Both layers, as on a real request: ours carries the renderer view,
        # the host's carries `@@aurora-blocks-view` around it.
        alsoProvides(self.request, IDericoBliccaPromoblockLayer)
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.contact = api.content.create(
            container=self.portal, type="Document", id="contact", title="Kontakt"
        )
        self.page = api.content.create(
            container=self.portal, type="Document", id="band-page", title="Leistungen"
        )
        alsoProvides(self.page, IBlocks)

    def render(self, node):
        """The markup the published page emits for a page holding one band."""
        blocks = {
            SOMERSAULT_BLOCK_ID: {
                "@type": SOMERSAULT_BLOCK_TYPE,
                "value": [node],
            }
        }
        return render_blocks(
            self.page,
            self.request,
            blocks,
            {"items": [SOMERSAULT_BLOCK_ID]},
        )


class TestTheFixtureItReads(ReferenceCaseTestCase):
    """The guard a fixture-driven suite needs before any of its assertions."""

    def test_the_case_is_where_this_file_thinks_it_is(self):
        # A renamed or deleted case would turn every test below into an
        # assertion about a band nobody authored.
        assert FIXTURE.is_file(), FIXTURE
        assert CASE_NAME in CASES, sorted(CASES)
        data = CASES[CASE_NAME]["data"]
        assert data["cta_secondary_link"] == "mailto:md@derico.de"
        assert data["blockWidth"] == "full"
        assert data["backgroundColor"] == "dark"
        assert "image" not in data and "image_url" not in data


class TestThePublishedBand(ReferenceCaseTestCase):
    """One authored node, through the pipeline a visitor's page runs."""

    def test_the_block_is_the_wrappers_only_child(self):
        # The composition claim, stated as an equality rather than as three
        # `in` checks: the host stamps the wrapper, we fill it, and there is
        # nothing else in between. `html` is the fixture's — the same string
        # the React renderer is held to.
        markup = self.render(band_node())
        inner = CASES[CASE_NAME]["html"]
        assert inner in markup
        prefix, suffix = markup.split(inner)
        assert suffix == "</div>"
        assert prefix.startswith("<div ")
        assert prefix.endswith(">")

    def test_the_wrapper_carries_the_width_and_the_ground(self):
        # `blockWidth` and `backgroundColor` are style fields: the plugin
        # machinery owns them, so they are the wrapper's stamp and NOT our
        # markup. This is the assertion behind the README's "there is no
        # background property" — the band's ground arrives from the host's
        # cross-block `--aurora-block-bg-*` vocabulary, full-bleed, without the
        # block minting a `--promo-bg` of its own.
        markup = self.render(band_node())
        stamp = "block block-promo has--block-width--full has--backgroundColor--dark"
        assert f'class="{stamp}"' in markup
        assert 'data-block-type="promo"' in markup
        assert "--block-width: 100%" in markup
        assert "--block-background: var(--aurora-block-bg-dark, #1e293b)" in markup
        assert "--block-foreground: var(--aurora-block-fg-dark, #f8fafc)" in markup

    def test_the_block_emits_neither_of_them_itself(self):
        # The fixture already says this for the React renderer; here the two
        # halves are in the same string, so "outside the block's root" is
        # checkable rather than asserted by convention.
        inner = self.render(band_node()).split('<div class="promo', 1)[1]
        for stamped in ("block-promo", "has--block-width--", "has--backgroundColor--"):
            assert stamped not in inner

    def test_an_image_less_band_is_centred_whatever_was_stored(self):
        # Ticket 17 rule 1, on the case that motivated it: the band has no
        # picture, so the effective placement is `center` even if a stored
        # `align` survives from an image the author removed.
        markup = self.render(band_node(align="left"))
        assert 'class="promo has--align--center"' in markup
        assert markup.count("has--align--") == 1
        assert "promo-image" not in markup


class TestTheTwoLinks(ReferenceCaseTestCase):
    """The point of reference case A: two links that are not alike.

    The *hazard* is pinned at the renderer, in
    ``test_view_promo_block_view.TestLinks`` — that ``path_of`` strips a
    ``mailto:``'s scheme, that a rejected scheme renders nothing, that a picked
    reference resolves and a dangling one does not. Repeating any of that here
    would be the same assertion at a longer range. What only the band adds is
    that the two shapes appear TOGETHER, in one render, with the serialization
    transforms and the wrapper in between.
    """

    def test_the_mailto_reaches_the_page_exactly_as_typed(self):
        markup = self.render(band_node())
        assert '<a class="promo-cta promo-cta-link" href="mailto:md@derico.de">' in markup

    def test_a_picked_button_resolves_beside_it(self):
        # How the band's button is really authored: `promo_link`'s Browse
        # disclosure stores `../resolveuid/<UID>` (ticket 07), which is
        # DOCUMENT-relative and would land somewhere different at every depth,
        # so the server resolves it to the target's own site-relative path.
        # The mailto sits in the same render and must not be touched by the
        # code path that rewrote its neighbour.
        uid = api.content.get_uuid(self.contact)
        markup = self.render(band_node(cta_primary_link=f"../resolveuid/{uid}"))
        assert f'href="{path_of(self.contact.absolute_url())}"' in markup
        assert "resolveuid" not in markup
        assert 'href="mailto:md@derico.de"' in markup


class TestTheVisitorsBand(ReferenceCaseTestCase):
    """Published, anonymous — the surface the band actually lives on."""

    def test_an_anonymous_visitor_gets_the_same_markup(self):
        # Worth rendering twice rather than trusting that nothing here is
        # permission-aware, because something is: `resolve_uid` goes through
        # the catalog, so the button's target has to be visible to the visitor
        # for the href to survive. The precondition is asserted rather than
        # assumed — a target the visitor cannot see would make the two renders
        # differ, which is exactly what this compares.
        uid = api.content.get_uuid(self.contact)
        node = band_node(cta_primary_link=f"../resolveuid/{uid}")
        as_editor = self.render(node)
        logout()
        try:
            assert api.user.has_permission("View", obj=self.contact)
            as_visitor = self.render(node)
        finally:
            login(self.portal, TEST_USER_NAME)
        assert as_visitor == as_editor
        assert f'href="{path_of(self.contact.absolute_url())}"' in as_visitor
        assert 'href="mailto:md@derico.de"' in as_visitor
