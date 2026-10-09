"""Upgrade step 1002 -> 1003: delete this add-on's own orphan block_api record.

Block add-ons are checked by the names their bundles import (ADR 0024,
plone.blicca.auroraeditor), and `block_api` left `IAuroraBlockAddon`. A
site that installed an earlier release of this add-on may still hold
`...promoblock.promo.block_api`; the editor's own upgrade step only clears
the records it knows about at its own upgrade time, so this add-on clears
its own.
"""

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons
from plone.registry import field
from plone.registry import Record
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME


PROFILE = "derico.blicca.promoblock:default"
KEY = f"{blockaddons.BLOCKADDON_PREFIX}/{RECORD_NAME}.block_api"


class TestUpgrade1003:
    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")
        self.registry = getUtility(IRegistry)

    def _upgrade(self):
        from derico.blicca.promoblock.upgrades.v1003 import upgrade

        upgrade(self.portal.portal_setup)

    def test_upgrade_handler_importable(self):
        from derico.blicca.promoblock.upgrades.v1003 import upgrade

        assert callable(upgrade)

    def test_upgrade_deletes_the_orphan_block_api_record(self):
        """A site that installed an earlier release still holds this key."""
        self.registry.records[KEY] = Record(field.TextLine(title="old"), "2.0")
        self._upgrade()
        assert KEY not in self.registry.records

    def test_upgrade_without_the_record_changes_nothing(self):
        assert KEY not in self.registry.records
        before = sorted(self.registry.records.keys())
        self._upgrade()
        assert sorted(self.registry.records.keys()) == before

    def test_upgrade_leaves_the_rest_of_the_record_alone(self):
        self.registry.records[KEY] = Record(field.TextLine(title="old"), "2.0")
        self._upgrade()
        record = block_addon_records()[RECORD_NAME]
        assert record.bundle == "++plone++derico.blicca.promoblock/promo-block.js"
        assert record.enabled

    def test_reaches_the_profile_version(self):
        self.setup_tool.setLastVersionForProfile(PROFILE, "1002")
        self.setup_tool.upgradeProfile(PROFILE, dest="1003")
        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1003",)
