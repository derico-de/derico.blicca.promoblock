"""The Promo's public renderer — registration, and the anatomy it must emit.

The headline test is ``TestAnatomy``: every case in ``tests/anatomy-cases.json``
at the package root, the same 25 hand-authored cases
``bundle-src/test/promo-anatomy.test.tsx`` holds the React renderer to. Ticket
17 exists so the two renderers cannot diverge; this file and that one are how
the two halves of that promise are kept.

The fixture is read twice over, the same way the vitest suite reads it:

- **Exactly**, up to attribute order, wherever the two renderers are expected
  to emit identical attributes — which is 24 of the 25 cases.
- **As a skeleton** — the markup with every attribute but ``class`` removed,
  text kept — for every case without exception. That is the cross-renderer
  contract, and it is what lets this renderer carry a real resolution ladder in
  its ``<img>`` and a resolved ``href`` on its anchors while being held to the
  same anatomy.

The table is then restated by hand below, so a fixture regenerated from the
code could not quietly redefine it.
"""

import json
import re
from pathlib import Path

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor.blockaddons import evaluate
from plone.blicca.auroraeditor.blockaddons import lockstep_gaps
from plone.blicca.auroraeditor.browser.rendering.base import BlockDispatchMixin
from zope.component import getMultiAdapter
from zope.interface import alsoProvides
from zope.publisher.browser import TestRequest

from derico.blicca.promoblock.blocks import PROMO_BLOCK_TYPE
from derico.blicca.promoblock.interfaces import IDericoBliccaPromoblockLayer
from derico.blicca.promoblock.views.promo_block_view import resolve_link


VIEW_NAME = f"aurora-block-{PROMO_BLOCK_TYPE}"

#: Walked up from this file, not hardcoded: the fixture sits at the package
#: root beside `bundle-src/`, deliberately outside both suites' trees so that
#: neither owns it.
FIXTURE = Path(__file__).resolve().parents[5] / "tests" / "anatomy-cases.json"

CASES = json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]

#: Cases whose ATTRIBUTES legitimately differ between the two renderers, with
#: the reason. The skeleton comparison still covers them; only the exact one is
#: waived. Deliberately a denylist, so a case added to the fixture falls into
#: the strict comparison and someone has to consciously exempt it.
ATTRIBUTE_EXEMPT = {
    "image-with-scales": (
        "image_source() builds the original-size download off ticket 10's "
        "base_path and adds the intrinsic width/height; the fixture's src is "
        "the editor's preview scale, which is that surface's own rule."
    ),
}

_TAG = re.compile(r"<([a-z0-9]+)((?:\s+[^\s=>]+(?:=\"[^\"]*\")?)*)\s*(/?)>", re.I)
_ATTRIBUTE = re.compile(r"[^\s=]+(?:=\"[^\"]*\")?")


def _rewrite(html, keep):
    """Rewrite every start tag, keeping the attributes ``keep`` selects.

    The self-closing slash is dropped along the way, wherever the tag pattern
    happened to sweep it up as an attribute. Chameleon writes void elements
    XHTML-style (``<img … />``) and React writes them HTML-style; that is a
    serializer's spelling of the same element, exactly like the attribute order
    the vitest suite normalizes away, and it is a no-op on the fixture, which
    carries no slashes.
    """

    def one(match):
        tag, attributes, _slash = match.groups()
        found = [a for a in _ATTRIBUTE.findall(attributes) if a != "/"]
        kept = sorted(attribute for attribute in map(keep, found) if attribute)
        return f"<{tag}{' ' + ' '.join(kept) if kept else ''}>"

    return _TAG.sub(one, html)


def canonical(html):
    """The markup with attribute ORDER normalized away, and nothing else.

    React deliberately writes an ``<img>``'s ``src`` last so the browser has
    the other attributes before it starts fetching; Chameleon writes attributes
    in template order. Sorting both sides keeps the exact comparison — text,
    nesting, element order, attribute VALUES — while leaving order out of it.
    """
    return _rewrite(html, lambda attribute: attribute)


def skeleton(html):
    """The cross-renderer contract: tags, ``class``, and text.

    The same rule ``bundle-src/test/promo-anatomy.test.tsx`` exports under this
    name, implemented against the same fixture.
    """
    return _rewrite(html, lambda a: a if a.startswith("class=") else "")


class PromoViewTestCase:
    """A document to render against, with the add-on's layer on the request."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.context = api.content.create(
            container=self.portal, type="Document", id="doc", title="A doc"
        )

    def _request(self):
        request = TestRequest()
        alsoProvides(request, IDericoBliccaPromoblockLayer)
        return request

    def render(self, data):
        """The markup ``render_block_data`` would emit for this stored node."""
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        view.block_type = PROMO_BLOCK_TYPE
        view.data = dict(data, **{"@type": PROMO_BLOCK_TYPE})
        return view()


class TestRegistration(PromoViewTestCase):
    """The dispatch convention, which is the whole of how a renderer is found."""

    def test_view_name_is_the_dispatch_convention(self):
        # BlockDispatchMixin resolves `aurora-block-<@type>` and nothing else;
        # the registry record's `types` field never influences it. ZCML cannot
        # interpolate, so the literal there is pinned from here.
        assert VIEW_NAME == "aurora-block-promo"
        view = getMultiAdapter((self.context, self._request()), name=VIEW_NAME)
        assert view.__name__ == VIEW_NAME

    def test_the_dispatcher_finds_it_rather_than_the_default(self):
        # The real path, not a lookup by hand: an unregistered @type falls back
        # to `aurora-block-default`, which emits `block-unrendered`.
        dispatcher = BlockDispatchMixin()
        dispatcher.context = self.context
        dispatcher.request = self._request()
        markup = dispatcher.render_block_data({"@type": PROMO_BLOCK_TYPE, "title": "Plone"})
        assert "block-unrendered" not in markup
        assert markup.startswith('<div class="promo ')

    def test_it_closes_the_wrappers_soft_lockstep_gap(self):
        # Ticket 12 installed the record with no renderer behind it, so the
        # wrapper warned on every edit-page render. `lockstep_gaps` only walks
        # add-ons that survived every gate, so an empty result here is also
        # proof the record is still loadable.
        request = self._request()
        statuses = evaluate(self.portal)
        assert [status.name for status in statuses], "no add-on registered at all"
        gaps = lockstep_gaps(self.portal, request, statuses)
        assert [gap for gap in gaps if gap["type"] == PROMO_BLOCK_TYPE] == []

    def test_it_renders_for_any_context_including_the_site_root(self):
        # `for="*"`: a promo can be authored on any blocks container, and on
        # the site root, where a footer renders on every page.
        view = getMultiAdapter((self.portal, self._request()), name=VIEW_NAME)
        view.data = {"@type": PROMO_BLOCK_TYPE, "title": "Plone"}
        assert "promo-title" in view()


class TestAnatomy(PromoViewTestCase):
    """The shared fixture, held against this renderer."""

    def test_the_fixture_covers_the_states_the_tables_enumerate(self):
        # A floor, not a total: deleting a case is how a renderer stops being
        # held to a row of the table, and that must not pass unnoticed.
        assert len(CASES) >= 23
        assert len({case["name"] for case in CASES}) == len(CASES)
        assert all(case["note"] for case in CASES)
        # Every exemption names a case that exists, and carries its reason.
        assert set(ATTRIBUTE_EXEMPT) <= {case["name"] for case in CASES}
        assert all(ATTRIBUTE_EXEMPT.values())

    @pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
    def test_matches_the_cross_renderer_skeleton(self, case):
        # `reactOnly` marks the one case where the two renderers legitimately
        # differ: a dangling reference has no image_url, so THIS renderer draws
        # the no-image layout (`html`) while the canvas previews the raw
        # reference. The fixture's `html` is always the server's expectation.
        assert skeleton(self.render(case["data"])) == skeleton(case["html"])
        if case.get("reactOnly"):
            assert case["reactOnly"]["why"]

    @pytest.mark.parametrize(
        "case",
        [case for case in CASES if case["name"] not in ATTRIBUTE_EXEMPT],
        ids=lambda case: case["name"],
    )
    def test_matches_the_fixture_exactly(self, case):
        assert canonical(self.render(case["data"])) == canonical(case["html"])

    def test_emits_no_whitespace_between_elements(self):
        # An inter-element newline is a real space in an inline formatting
        # context, and a real line box inside the Plate editable's pre-wrap.
        # One sheet dresses both surfaces, so the template's indentation cannot
        # survive into the output.
        full = self.render({
            "head_title": "Kontakt",
            "title": "Erstgespräch vereinbaren",
            "description": "Ein Satz.",
            "image_url": "/pic.jpg/@@images/image/large",
            "align": "left",
            "card_link": "/leistungen",
        })
        assert re.search(r">\s+<", full) is None
        assert full == full.strip()

    def test_keeps_whitespace_inside_a_value(self):
        # The collapse is sound because every text value is stripped, not
        # because whitespace is rare: a title's own spaces must survive it.
        markup = self.render({"title": "Erstgespräch  vereinbaren "})
        assert ">Erstgespräch  vereinbaren<" in markup

    def test_escapes_what_an_author_typed(self):
        # The collapse rewrites structural angle brackets, so it is only sound
        # while no value can emit one.
        markup = self.render({"title": "<script>alert(1)</script>"})
        assert "<script>" not in markup
        assert "&lt;script&gt;" in markup


class TestTheTableRestated(PromoViewTestCase):
    """Ticket 17's table, written out by hand rather than read from a file."""

    FULL = {
        "head_title": "Kontakt",
        "title": "Erstgespräch vereinbaren",
        "description": "Ein Satz.",
        "image_url": "/pic.jpg/@@images/image/large",
        "align": "left",
        "cta_primary_label": "Termin",
        "cta_primary_link": "/kontakt",
        "cta_secondary_label": "md@derico.de",
        "cta_secondary_link": "mailto:md@derico.de",
        "cta_secondary_variant": "link",
    }

    def _classes(self, data):
        return re.findall(r'class="([^"]*)"', self.render(data))

    def test_the_root_is_our_own_div_never_the_host_stamp(self):
        # `block block-promo has--block-width--<w>` and any
        # `has--backgroundColor--` are stamped on the wrapper OUTSIDE this
        # markup, by the Plate renderer's `_block_attrs`. Emitting them here
        # would double them.
        markup = self.render(dict(self.FULL, blockWidth="full", backgroundColor="grey"))
        assert markup.startswith('<div class="promo has--align--left">')
        for owned in ("block-promo", "has--block-width--", "has--backgroundColor--"):
            assert owned not in markup

    def test_the_root_keeps_its_tag_and_classes_when_a_card_link_appears(self):
        # Ticket 17 rule 4. A root whose tag went conditional would force both
        # renderers to agree on a branch at the single element the whole
        # stylesheet hangs off.
        plain = self.render({"title": "Plone"})
        wrapped = self.render({"title": "Plone", "card_link": "/x"})
        assert (
            plain
            == '<div class="promo has--align--center">'
            + plain.split('<div class="promo has--align--center">', 1)[1]
        )
        assert '<a class="promo-cardlink" href="/x">' in wrapped
        assert (
            wrapped.replace('<a class="promo-cardlink" href="/x">', "").replace("</a>", "") == plain
        )

    @pytest.mark.parametrize(
        "data,expected",
        [
            ({}, "center"),
            ({"align": "left"}, "center"),
            ({"image_url": "/p"}, "center"),
            ({"image_url": "/p", "align": "left"}, "left"),
            ({"image_url": "/p", "align": "right"}, "right"),
            ({"image_url": "/p", "align": "center"}, "center"),
            ({"image_url": "/p", "align": "top"}, "center"),
        ],
    )
    def test_has_align_is_emitted_always_with_the_effective_placement(self, data, expected):
        markup = self.render(data)
        assert f"has--align--{expected}" in markup
        assert len(re.findall(r"has--align--", markup)) == 1

    def test_no_image_presence_class_exists(self):
        # Rule 2: `has--align--` carrying the effective placement is what makes
        # one unnecessary, and one selector family in the sheet rather than two.
        assert self._classes({"image_url": "/p"})[0] == self._classes({})[0]

    def test_the_elements_are_exactly_the_twelve_classes(self):
        emitted = set()
        for value in self._classes(self.FULL):
            emitted.update(value.split())
        assert sorted(emitted) == [
            "has--align--left",
            "promo",
            "promo-actions",
            "promo-copy",
            "promo-cta",
            "promo-cta-button",
            "promo-cta-link",
            "promo-description",
            "promo-image",
            "promo-kicker",
            "promo-title",
        ]
        # The twelfth is the wrapper, which the click rule excludes from FULL.
        assert "promo-cardlink" in self.render({"title": "Plone", "card_link": "/x"})

    def test_the_tags_are_the_ones_ticket_17_chose(self):
        markup = self.render(self.FULL)
        # <div>, not <section>: a nameless region in the accessibility tree,
        # four times over on a page of promos, is worse than none.
        assert "<section" not in markup
        # <h2>: a promo that never enters the document outline is invisible to
        # anyone navigating by heading.
        assert '<h2 class="promo-title">' in markup
        assert '<p class="promo-kicker">' in markup
        assert '<p class="promo-description">' in markup
        assert '<picture class="promo-image">' in markup
        assert re.search(r'<picture class="promo-image"><img\b', markup)

    def test_never_emits_a_container_a_heading_or_an_anchor_with_nothing_in_it(self):
        # Rule 3, generalized: no empty element anywhere, so there is no
        # empty-heading hazard and no container for the sheet to space out
        # around nothing.
        assert self.render({}) == '<div class="promo has--align--center"></div>'
        for data in ({"title": "x"}, {"image_url": "/p"}, {"card_link": "/x"}):
            markup = self.render(data)
            for empty in re.finditer(r"<(div|p|h2|a)\b([^>]*)></\1>", markup):
                # The block root is the one element allowed to stand empty:
                # rules 3 and 4 compose, so an empty promo inside a card-link
                # wrapper is still exactly one element.
                assert 'class="promo has--align--' in empty.group(0), empty.group(0)

    def test_marks_the_picture_decorative(self):
        # Ticket 03 declared no alt field. The title and description carry the
        # meaning; an alt invented from the title would be read twice.
        assert 'alt=""' in self.render(self.FULL)
        assert "alt=" not in self.render(self.FULL).replace('alt=""', "")


class TestTheClickRule(PromoViewTestCase):
    """Any action label present ⇒ the actions take the clicks (Q8 rows 4, 5)."""

    CARD = "/leistungen"

    @pytest.mark.parametrize(
        "name,data,expected",
        [
            ("no label, no card link", {}, "neither"),
            ("no label, card link set", {"card_link": CARD}, "cardlink"),
            (
                "label and link, no card link",
                {"cta_primary_label": "Los", "cta_primary_link": "/x"},
                "actions",
            ),
            (
                "label and link, card link also set",
                {
                    "cta_primary_label": "Los",
                    "cta_primary_link": "/x",
                    "card_link": CARD,
                },
                "actions",
            ),
            (
                "label without a link, card link set",
                {"cta_primary_label": "Los", "card_link": CARD},
                "neither",
            ),
            (
                "link without a label, card link set",
                {"cta_primary_link": "/x", "card_link": CARD},
                "cardlink",
            ),
        ],
    )
    def test_all_six_label_link_combinations(self, name, data, expected):
        markup = self.render(dict(data, title="Plone"))
        assert ("promo-cardlink" in markup) is (expected == "cardlink"), name
        assert ("promo-cta" in markup) is (expected == "actions"), name

    def test_never_nests_one_interactive_element_inside_another(self):
        for data in (
            {"card_link": self.CARD},
            {
                "cta_primary_label": "Los",
                "cta_primary_link": "/x",
                "card_link": self.CARD,
            },
            {"cta_primary_link": "/x", "card_link": self.CARD},
        ):
            markup = self.render(dict(data, title="Plone"))
            # No `<a` may appear between an `<a` and its `</a>`.
            assert re.search(r"<a\b[^>]*>(?:(?!</a>).)*<a\b", markup) is None

    def test_a_hidden_card_link_survives_on_disk_and_comes_back(self):
        # The field is only OFFERED while both labels are empty; a value set
        # earlier survives and returns when the labels clear.
        stored = {"title": "Plone", "card_link": "/leistungen"}
        assert "promo-cardlink" not in self.render(dict(stored, cta_primary_label="Los"))
        assert "promo-cardlink" in self.render(stored)


class TestLinks(PromoViewTestCase):
    """Screening decides what renders; resolution decides where it points."""

    def test_a_mailto_action_survives_whole(self):
        # The reference case's own action, and the reason `path_of()` is not
        # the tool for this.
        markup = self.render({
            "cta_primary_label": "md@derico.de",
            "cta_primary_link": "mailto:md@derico.de",
        })
        assert 'href="mailto:md@derico.de"' in markup

    def test_path_of_would_have_mangled_it(self):
        # Pinning the documented limit this block is the first live case of:
        # urlparse("mailto:…").path is truthy, so path_of reports the address
        # with the scheme stripped. `resolve_link` never feeds it a value that
        # is not an internal absolute URL.
        from plone.blicca.auroraeditor.rendering import path_of

        assert path_of("mailto:md@derico.de") == "md@derico.de"
        assert path_of("tel:+49123") == "+49123"
        assert resolve_link("mailto:md@derico.de") == "mailto:md@derico.de"
        assert resolve_link("tel:+49123") == "tel:+49123"

    @pytest.mark.parametrize(
        "link",
        ["javascript:alert(1)", "data:text/html,<script>", "//evil.example/x", "  "],
    )
    def test_an_unfollowable_link_renders_nothing_at_all(self, link):
        # Q8 rows 2/3/8 are one rule: a link that fails the screen is treated
        # exactly as an absent link. Rendering it as text with no href would
        # emit a `.promo-cta` ticket 17's table forbids.
        markup = self.render({
            "title": "Plone",
            "cta_primary_label": "Los",
            "cta_primary_link": link,
        })
        assert "promo-cta" not in markup
        assert "Los" not in markup
        # ...and the same value in the card link emits no wrapper.
        assert "promo-cardlink" not in self.render({"title": "Plone", "card_link": link})

    def test_a_picked_reference_resolves_to_the_targets_real_path(self):
        # Ticket 07 stores a picked link as `../resolveuid/<UID>` in both
        # hosts. Emitting that raw would resolve against the published page's
        # own URL and land somewhere different at every depth.
        target = api.content.create(
            container=self.portal, type="Document", id="leistungen", title="Leistungen"
        )
        uid = api.content.get_uuid(target)
        markup = self.render({
            "cta_primary_label": "Mehr",
            "cta_primary_link": f"../resolveuid/{uid}",
        })
        assert f'href="{"/".join(target.getPhysicalPath())}"' in markup
        assert "resolveuid" not in markup

    def test_a_dangling_reference_still_renders_the_action(self):
        # Resolution improves the href; it never decides the anatomy. Unlike a
        # missing picture — which changes the layout, so the two renderers must
        # agree about it — a dead link changes nothing but where the click
        # goes, and the canvas renders the action too.
        markup = self.render({
            "cta_primary_label": "Mehr",
            "cta_primary_link": "../resolveuid/gone",
        })
        assert 'href="../resolveuid/gone"' in markup
        assert "promo-cta" in markup

    def test_a_typed_path_is_emitted_as_typed(self):
        # `resolve_uid` returns anything it cannot match unchanged, so a path
        # the author typed is never silently rewritten to something else.
        markup = self.render({"cta_primary_label": "Los", "cta_primary_link": "/kontakt"})
        assert 'href="/kontakt"' in markup


class TestThePicture(PromoViewTestCase):
    """`image_url` is the gate; `image_source()` is the ladder."""

    SCALES = {
        "image": [
            {
                "download": "@@images/image-1200-abc.jpeg",
                "width": 1200,
                "height": 800,
                "base_path": "/pic.jpg",
            }
        ]
    }

    def test_scales_bring_intrinsic_dimensions(self):
        # width/height are what stop the picture reflowing the page as it
        # loads, and they are the whole of what image_source() adds here.
        markup = self.render({
            "image_url": "/pic.jpg/@@images/image/large",
            "image_field": "image",
            "image_scales": self.SCALES,
        })
        assert 'src="/pic.jpg/@@images/image-1200-abc.jpeg"' in markup
        assert 'width="1200"' in markup
        assert 'height="800"' in markup

    def test_no_srcset_is_built(self):
        # Ticket 08's reason holds identically here: `w` descriptors without a
        # `sizes` policy default to 100vw and over-fetch, and `sizes` depends
        # on blockWidth and the theme's layout, neither of which a generic
        # block can know.
        markup = self.render({
            "image_url": "/pic.jpg/@@images/image/large",
            "image_field": "image",
            "image_scales": self.SCALES,
        })
        assert "srcset" not in markup

    def test_without_scales_the_picture_is_still_emitted(self):
        # image_source() answering None means "no scale-derived ladder", not
        # "no <picture>": ticket 17 made the element unconditional on both
        # surfaces precisely so this branch is invisible to the stylesheet.
        markup = self.render({"image_url": "https://plone.org/logo.png"})
        assert '<picture class="promo-image">' in markup
        assert 'src="https://plone.org/logo.png"' in markup
        assert "width=" not in markup

    def test_an_svg_is_rendered_plainly(self):
        # image_source() declines to scale vector art. The image_url ticket 10
        # emits is the original-size download, which is what an SVG wants.
        markup = self.render({
            "image_url": "/logo.svg/@@images/image-0-def.svg",
            "image_field": "image",
            "image_scales": {
                "image": [
                    {
                        "download": "@@images/image-0-def.svg",
                        "content-type": "image/svg+xml",
                        "base_path": "/logo.svg",
                    }
                ]
            },
        })
        assert 'src="/logo.svg/@@images/image-0-def.svg"' in markup
        assert "width=" not in markup

    @pytest.mark.parametrize(
        "value",
        [None, "", "   ", "javascript:alert(1)", "mailto:x@y", "//evil.example/p.png"],
    )
    def test_an_unusable_image_url_draws_the_no_image_layout(self, value):
        # The image field is a free-text surface in native Aurora too (ticket
        # 01), and ticket 10 emits an external value whole — so screening here
        # is what covers it.
        markup = self.render({"title": "Plone", "image_url": value})
        assert "promo-image" not in markup
        assert "has--align--center" in markup

    def test_a_dangling_reference_draws_the_no_image_layout(self):
        # Ticket 10's signal: a reference whose target was deleted yields no
        # image_url at all, so the server shows no picture rather than a
        # guaranteed 404. This is the one case the fixture marks `reactOnly`.
        markup = self.render({"title": "Plone", "image": "../resolveuid/gone"})
        assert "promo-image" not in markup
