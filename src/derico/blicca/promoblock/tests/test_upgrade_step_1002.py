"""Upgrade step 1001 -> 1002: no-op now that block_api is retired.

The step's only value was `block_api`; ADR 0024 (plone.blicca.auroraeditor)
retired the field, so this step now imports an empty records element.
Held here: a site still in transit through 1002 reaches it without error
and with its record untouched.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME


PROFILE = "derico.blicca.promoblock:default"
PREFIX = f"{blockaddons.BLOCKADDON_PREFIX}/{RECORD_NAME}"


class TestUpgrade1002:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        self.setup_tool.setLastVersionForProfile(PROFILE, "1001")

    def test_the_block_still_loads(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        assert statuses[RECORD_NAME].loadable

    def test_leaves_the_rest_of_the_record_alone(self):
        api.portal.set_registry_record(f"{PREFIX}.enabled", False)
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        record = block_addon_records()[RECORD_NAME]
        assert record.enabled is False
        assert record.bundle == "++plone++derico.blicca.promoblock/promo-block.js"

    def test_reaches_the_profile_version(self):
        self.setup_tool.upgradeProfile(PROFILE, dest="1002")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1002",)
