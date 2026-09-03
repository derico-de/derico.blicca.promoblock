"""Tests for upgrade step 1000 -> 1001: the block add-on record.

Version 1001 is declarative — it adds one ``IAuroraBlockAddon`` record and
nothing else — so the step is an ``upgradeDepends`` on a mini profile that
carries a copy of ``profiles/default/registry.xml``, narrowed with
``import_steps`` to the registry step alone. Two things can go wrong with
that shape and neither shows up at install time:

* the wiring (source, destination, profile id) can be off, so a site at 1000
  is simply never offered the upgrade, and
* the copy can drift from the default profile, so a fresh install and an
  upgraded site end up with different records.

Both are held here.
"""

import pathlib
import xml.etree.ElementTree as ET

import pytest
from plone import api
from plone.app.testing import setRoles
from plone.app.testing import TEST_USER_ID
from plone.blicca.auroraeditor import blockaddons
from Products.GenericSetup.upgrade import UpgradeDepends

import derico.blicca.promoblock

from .test_setup import block_addon_records
from .test_setup import RECORD_NAME


PROFILE = "derico.blicca.promoblock:default"
UPGRADE_PROFILE = "derico.blicca.promoblock.upgrades:1001"

PACKAGE = pathlib.Path(derico.blicca.promoblock.__file__).parent
DEFAULT_REGISTRY = PACKAGE / "profiles" / "default" / "registry.xml"
UPGRADE_REGISTRY = PACKAGE / "upgrades" / "1001" / "registry.xml"


def normalized(path):
    """The XML's structure, stripped of comments and whitespace.

    ElementTree drops comments while parsing, so the two files' prose may
    differ freely; only what GenericSetup acts on is compared.
    """

    def walk(elem):
        text = (elem.text or "").strip()
        return (
            elem.tag,
            tuple(sorted(elem.attrib.items())),
            text,
            tuple(walk(child) for child in elem),
        )

    # S314: the two files parsed here are this package's own committed
    # profile XML, not input.
    return walk(ET.parse(path).getroot())  # noqa: S314


class TestUpgradeProfileParity:
    """The upgrade profile's copy of the record must not drift."""

    def test_upgrade_registry_matches_the_default_profile(self):
        """A fresh install and an upgraded site get the same record.

        The duplication is forced: the default profile is what a fresh
        install imports and the mini profile is what a site at 1000 imports,
        and GenericSetup gives no way to point the second at the first. So
        the copy is held identical here instead.
        """
        assert normalized(UPGRADE_REGISTRY) == normalized(DEFAULT_REGISTRY)


class TestUpgrade1001:
    """Test upgrade to version 1001."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        setRoles(self.portal, TEST_USER_ID, ["Manager"])
        self.setup_tool = api.portal.get_tool("portal_setup")

    def _rewind_to_1000(self):
        """Put the site back in the state 1001 upgrades from.

        Not just the version marker: the record is deleted too, so the test
        proves the upgrade *imports* something rather than merely finding
        what the install profile already left behind.
        """
        self.setup_tool.setLastVersionForProfile(PROFILE, "1000")
        registry = api.portal.get_tool("portal_registry")
        prefix = f"{blockaddons.BLOCKADDON_PREFIX}/{RECORD_NAME}."
        for name in list(registry.records.keys()):
            if name.startswith(prefix):
                del registry.records[name]
        assert RECORD_NAME not in block_addon_records()

    def test_upgrade_is_offered_to_a_site_at_1000(self):
        """The step is wired to the right source, destination and profile.

        A misspelled `source` or `profile` makes the step invisible: the site
        stays at 1000 for ever with no error anywhere.
        """
        self._rewind_to_1000()
        steps = self.setup_tool.listUpgrades(PROFILE)
        assert steps, "no upgrade offered to a site at profile version 1000"
        flattened = [s for group in steps for s in (group if isinstance(group, list) else [group])]
        assert any(s["dest"] == ("1001",) for s in flattened)

    def test_upgrade_reinstates_the_record(self):
        """Running the upgrade leaves the site with a loadable add-on."""
        self._rewind_to_1000()

        self.setup_tool.upgradeProfile(PROFILE)

        assert self.setup_tool.getLastVersionForProfile(PROFILE) == ("1001",)
        record = block_addon_records()[RECORD_NAME]
        assert record.bundle == "++plone++derico.blicca.promoblock/promo-block.js"
        statuses = {s.name: s for s in blockaddons.evaluate(self.portal)}
        assert statuses[RECORD_NAME].loadable

    def test_upgrade_is_narrowed_to_the_registry_step(self):
        """The step re-imports one import step, not the whole mini profile.

        `UpgradeDepends` with an empty `import_steps` calls
        `runAllImportStepsFromProfile`, which runs *every* registered import
        step against the profile — and a step whose file is merely absent
        still runs its handler, so an upgrade would re-run this package's own
        uninstall step.

        Asserted on the registered step rather than on an observable effect,
        deliberately: today's uninstall handler is a no-op and the other
        steps are file-driven, so nothing yet *breaks* without the narrowing.
        It is a guard against a handler that grows teeth later, and this is
        the only way to hold it now.
        """
        self._rewind_to_1000()
        depends = [
            s["step"]
            for group in self.setup_tool.listUpgrades(PROFILE)
            for s in (group if isinstance(group, list) else [group])
            if isinstance(s.get("step"), UpgradeDepends)
        ]
        assert depends, "the 1001 step is not an upgradeDepends any more"
        for step in depends:
            assert list(step.import_steps) == ["plone.app.registry"]


class TestUpgradeProfilesHidden:
    """Every upgrade profile stays out of the add-ons control panel."""

    @pytest.fixture(autouse=True)
    def _setup(self, integration):
        self.portal = integration["portal"]
        self.setup_tool = api.portal.get_tool("portal_setup")

    def test_every_upgrade_profile_is_non_installable(self):
        """Scaffolding a step registers an EXTENSION profile; hide it.

        `plonecli add upgrade_step` does not add the new profile to
        `HiddenProfiles`, so this fails the moment a later step is scaffolded
        and the list is not updated — which is exactly when nobody would
        think to look.
        """
        from derico.blicca.promoblock.setuphandlers import HiddenProfiles

        hidden = set(HiddenProfiles().getNonInstallableProfiles())
        registered = {
            info["id"]
            for info in self.setup_tool.listProfileInfo()
            if info["id"].startswith("derico.blicca.promoblock.upgrades:")
        }
        assert registered, "no upgrade profile is registered at all"
        assert registered <= hidden
