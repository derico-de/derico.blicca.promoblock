"""Reading the Promo's stored JSON, and the tables that are spelled twice.

``promo_data`` is the Python twin of ``bundle-src/src/promo/data.ts``. The
degradation table (ticket 03 Q8) and the scheme allowlists (Q7) live in both,
because the two renderers run in different languages, so the risk this file
exists for is a **one-sided edit**: a table extended in TS and not here would
let the canvas render a link the public page drops, and one scope-wrapped
stylesheet dresses both surfaces.

``TestScreenParity`` is therefore Python-reads-TS, as ticket 08 fixed the
direction: Python arrives second, and reading a TS literal from Python is much
the cheaper way round. ``bundle-src/test/promo-screen.test.ts`` owns the
*behaviour* of the JS spelling; the lockstep assertion is here.
"""

import re
from pathlib import Path

import pytest

from derico.blicca.promoblock import promo_data


DATA_TS = Path(__file__).resolve().parents[5] / "bundle-src" / "src" / "promo" / "data.ts"

_ARRAY = r"export const {name} = \[([^\]]*)\]"
_SCALAR = r"export const {name} = '([^']*)';"


def ts_array(name):
    """A ``export const NAME = ['a', 'b'] as const;`` literal, as a tuple."""
    match = re.search(_ARRAY.format(name=name), DATA_TS.read_text(encoding="utf-8"))
    assert match, f"no `export const {name} = [...]` in {DATA_TS}"
    return tuple(re.findall(r"'([^']*)'", match.group(1)))


def ts_scalar(name):
    """A ``export const NAME = 'x';`` literal."""
    match = re.search(_SCALAR.format(name=name), DATA_TS.read_text(encoding="utf-8"))
    assert match, f"no `export const {name} = '...'` in {DATA_TS}"
    return match.group(1)


class TestScreenParity:
    """The tables, held level with the editor half's."""

    def test_the_ts_file_is_where_this_test_thinks_it_is(self):
        # The failure mode a cross-language lockstep test has to rule out
        # first: a moved or reformatted source silently turning every
        # assertion below into a comparison against nothing.
        assert DATA_TS.is_file(), DATA_TS
        assert ts_array("LINK_SCHEMES"), "the parser found an empty list"

    def test_link_schemes_match(self):
        # An allowlist, not a blocklist: all three link fields are author-typed
        # free text (Q1), and a blocklist fails open on the scheme nobody
        # thought of. Extended together or not at all.
        assert ts_array("LINK_SCHEMES") == promo_data.LINK_SCHEMES

    def test_image_schemes_match(self):
        # `mailto:` and `tel:` are meaningless as an <img src>, and the image
        # field is a free-text surface too in native Aurora (ticket 01).
        assert ts_array("IMAGE_SCHEMES") == promo_data.IMAGE_SCHEMES

    def test_the_q5_fallbacks_match(self):
        # Spelled in both renderers rather than trusted from the schema's
        # `default` keys, which are spread into the widget as props and are not
        # reliably written to the node.
        assert ts_scalar("DEFAULT_VARIANT") == promo_data.DEFAULT_VARIANT
        assert ts_scalar("DEFAULT_ALIGN") == promo_data.DEFAULT_ALIGN
        assert ts_array("ALIGNMENTS") == promo_data.ALIGNMENTS
        assert ts_array("CTA_SLOTS") == promo_data.CTA_SLOTS


class TestScreen:
    """Q7's allowlist, and the shapes it has to answer for."""

    @pytest.mark.parametrize(
        "value",
        [
            "/kontakt",
            "kontakt",
            "../resolveuid/8f2c1a9e",
            "http://example.org/x",
            "https://example.org/x",
            "HTTPS://example.org/x",
            "mailto:md@derico.de",
            "tel:+49123",
        ],
    )
    def test_passes_a_usable_link(self, value):
        assert promo_data.screen_link(value) == value

    @pytest.mark.parametrize(
        "value",
        [
            "javascript:alert(1)",
            "JavaScript:alert(1)",
            "data:text/html,<script>",
            "vbscript:x",
            "file:///etc/passwd",
            # A protocol-relative URL wearing a path's clothes: the scheme it
            # inherits is never screened, so it is rejected outright.
            "//evil.example/x",
        ],
    )
    def test_rejects_an_unfollowable_link(self, value):
        assert promo_data.screen_link(value) == ""

    @pytest.mark.parametrize("value", [None, "", "   ", 42, [], {}, ["/x"], {"@id": "/x"}, True])
    def test_answers_absent_for_anything_that_is_not_a_string(self, value):
        # Nothing is required, so every reader has to answer "absent" without
        # throwing. The stored value is always a bare string or absent
        # (ticket 01), but a hand-written or migrated node need not be.
        assert promo_data.screen_link(value) == ""
        assert promo_data.screen_image(value) == ""

    def test_strips_what_the_author_typed(self):
        assert promo_data.screen_link("  /kontakt  ") == "/kontakt"

    def test_images_take_a_narrower_list_than_links(self):
        # The one place the two allowlists differ, and the reason they are two.
        assert promo_data.screen_link("mailto:md@derico.de")
        assert promo_data.screen_image("mailto:md@derico.de") == ""
        assert promo_data.screen_image("/pic.jpg/@@images/image/large")


class TestActions:
    """Q8 rows 2, 3 and 8, which ticket 08 reconciled into one rule."""

    def test_a_complete_action_renders(self):
        assert promo_data.action(
            {"cta_primary_label": "Los", "cta_primary_link": "/x"}, "primary"
        ) == {"label": "Los", "href": "/x", "variant": "button"}

    @pytest.mark.parametrize(
        "data",
        [
            {"cta_primary_label": "Los"},
            {"cta_primary_link": "/x"},
            {"cta_primary_label": "Los", "cta_primary_link": "javascript:alert(1)"},
            {"cta_primary_label": "  ", "cta_primary_link": "/x"},
            {},
        ],
    )
    def test_a_half_filled_or_unfollowable_action_renders_nothing(self, data):
        # Symmetric on purpose: a button that goes nowhere is worse than an
        # absent one, and a link that fails the screen is treated exactly as an
        # absent link.
        assert promo_data.action(data, "primary") is None

    @pytest.mark.parametrize("stored,expected", [("link", "link"), ("button", "button")])
    def test_a_stored_variant_is_kept(self, stored, expected):
        action = promo_data.action(
            {
                "cta_primary_label": "Los",
                "cta_primary_link": "/x",
                "cta_primary_variant": stored,
            },
            "primary",
        )
        assert action["variant"] == expected

    @pytest.mark.parametrize("stored", [None, "", "ghost", "Link", 42])
    def test_anything_else_falls_back_to_button(self, stored):
        # An off-list variant is not a third appearance, so the sheet never
        # meets a promo-cta with no variant class.
        action = promo_data.action(
            {
                "cta_primary_label": "Los",
                "cta_primary_link": "/x",
                "cta_primary_variant": stored,
            },
            "primary",
        )
        assert action["variant"] == "button"

    def test_the_slots_are_symmetric_and_ordered(self):
        both = promo_data.actions({
            "cta_primary_label": "A",
            "cta_primary_link": "/a",
            "cta_secondary_label": "B",
            "cta_secondary_link": "/b",
        })
        assert [entry["label"] for entry in both] == ["A", "B"]
        alone = promo_data.actions({"cta_secondary_label": "B", "cta_secondary_link": "/b"})
        assert [entry["label"] for entry in alone] == ["B"]


class TestTheClickRule:
    """Keyed on the LABEL, not on whether an action renders."""

    def test_a_card_link_survives_while_both_labels_are_empty(self):
        assert promo_data.card_link({"card_link": "/leistungen"}) == "/leistungen"

    def test_any_label_at_all_suppresses_it(self):
        for data in (
            {"card_link": "/leistungen", "cta_primary_label": "Los"},
            {"card_link": "/leistungen", "cta_secondary_label": "Los"},
        ):
            assert promo_data.card_link(data) == ""

    def test_even_a_label_whose_action_renders_nothing(self):
        # The harsh corner, and it is deliberate (Q8 row 5 says "any label
        # set"): the promo is then not clickable at all. Keying on the rendered
        # action instead would make the card link blink back the moment a link
        # was mistyped.
        data = {"card_link": "/leistungen", "cta_primary_label": "Los"}
        assert promo_data.actions(data) == []
        assert promo_data.card_link(data) == ""

    def test_a_hidden_value_is_not_destroyed(self):
        # The field is only OFFERED while both labels are empty; the value
        # survives on disk and returns when the labels clear.
        stored = {"card_link": "/leistungen", "cta_primary_label": "Los"}
        assert stored["card_link"] == "/leistungen"
        assert promo_data.card_link({"card_link": stored["card_link"]}) == "/leistungen"

    def test_an_unfollowable_card_link_emits_no_wrapper(self):
        assert promo_data.card_link({"card_link": "data:text/html,<script>"}) == ""


class TestTheImageGate:
    """`image_url` is the single source, and its absence is the signal."""

    def test_the_transformers_key_is_what_decides(self):
        assert promo_data.has_image({"image_url": "/pic.jpg/@@images/image/large"})
        assert promo_data.image_url({"image_url": "https://plone.org/logo.png"})

    def test_a_raw_reference_alone_is_not_a_picture(self):
        # The server never guesses from the stored value the way the canvas
        # does: ticket 10 has already run, so a bare reference with no derived
        # key means the target is gone.
        assert not promo_data.has_image({"image": "../resolveuid/gone"})
        assert not promo_data.has_image({"image": "/pic.jpg"})

    def test_an_unscreenable_value_is_not_a_picture(self):
        # Ticket 10 emits an external free-text URL whole, so the image field's
        # own free-text surface is screened here and nowhere else.
        assert not promo_data.has_image({"image_url": "javascript:alert(1)"})
        assert not promo_data.has_image({"image_url": "mailto:x@y"})


class TestEffectiveAlign:
    """Ticket 17 rule 1: always emitted, always the effective placement."""

    @pytest.mark.parametrize(
        "data,expected",
        [
            ({}, "center"),
            ({"align": "left"}, "center"),
            ({"align": "left", "image_url": "/p"}, "left"),
            ({"align": "right", "image_url": "/p"}, "right"),
            ({"align": "center", "image_url": "/p"}, "center"),
            ({"align": "top", "image_url": "/p"}, "center"),
            ({"align": 42, "image_url": "/p"}, "center"),
            ({"image_url": "/p"}, "center"),
        ],
    )
    def test_the_effective_placement(self, data, expected):
        assert promo_data.effective_align(data) == expected

    def test_an_orphaned_align_survives_on_disk(self):
        # Q8 row 7: `left` stored, image later cleared. The class reads
        # `center`; the stored value is untouched, so clearing the image is not
        # a destructive edit.
        data = {"align": "left"}
        assert promo_data.effective_align(data) == "center"
        assert data["align"] == "left"


class TestReadingTolerantly:
    """Nothing is required, so nothing may throw."""

    @pytest.mark.parametrize("data", [None, {}, {"@type": "promo"}])
    def test_an_empty_node_answers_for_everything(self, data):
        assert promo_data.actions(data) == []
        assert promo_data.card_link(data) == ""
        assert promo_data.image_url(data) == ""
        assert promo_data.effective_align(data) == "center"
        assert promo_data.has_any_label(data) is False
