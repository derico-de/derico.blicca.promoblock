"""Picking the picture variant and the ``sizes`` for the promo image."""

import pytest

from derico.blicca.promoblock import picture


STOCK = {
    "small": {"sourceset": [{"scale": "preview"}]},
    "medium": {"sourceset": [{"scale": "teaser"}]},
    "large": {"sourceset": [{"scale": "larger"}]},
}
WITH_FULLWIDTH = dict(STOCK, fullwidth={"sourceset": [{"scale": "huge"}]})


@pytest.fixture(autouse=True)
def _site(integration):
    """``get_scale_width`` reads the site's allowed sizes."""


@pytest.mark.parametrize(
    "data, align, variants, expected",
    [
        ({"blockWidth": "narrow"}, "center", STOCK, "large"),
        ({"blockWidth": "narrow"}, "left", STOCK, "small"),
        ({}, "right", STOCK, "medium"),
        ({"blockWidth": "layout"}, "left", STOCK, "large"),
        ({"blockWidth": "layout"}, "center", STOCK, "large"),
        ({"blockWidth": "layout"}, "center", WITH_FULLWIDTH, "fullwidth"),
        ({"blockWidth": "full"}, "left", WITH_FULLWIDTH, "fullwidth"),
    ],
)
def test_the_smallest_variant_covering_the_image_wins(data, align, variants, expected):
    assert picture.variant_for(data, align, variants) == expected


def test_no_usable_variant_means_no_ladder():
    assert picture.variant_for({}, "center", {"custom": STOCK["large"]}) is None


def test_an_unknown_block_width_reads_as_default():
    assert picture.sizes({"blockWidth": "huge"}, "center") == ("(min-width: 940px) 940px, 100vw")


def test_a_full_width_side_image_is_half_the_viewport():
    assert picture.sizes({"blockWidth": "full"}, "right") == (
        "(min-width: 40rem) calc((100vw - 2rem) / 2), 100vw"
    )
