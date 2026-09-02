"""Testing setup for derico.blicca.promoblock."""
import os

import plone.app.theming
import plone.restapi
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PloneSandboxLayer
from plone.app.testing import SITE_OWNER_NAME
from plone.app.testing import SITE_OWNER_PASSWORD
from plone.testing.zope import WSGI_SERVER_FIXTURE

import derico.blicca.promoblock


class DericoBliccaPromoblockLayer(PloneSandboxLayer):
    """Custom testing layer for derico.blicca.promoblock."""

    def setUpZope(self, app, configurationContext):
        """Set up Zope."""
        # Compile .po -> .mo so add-on translations load during tests.
        os.environ.setdefault("zope_i18n_compile_mo_files", "true")
        self.loadZCML(package=plone.app.theming)
        self.loadZCML(package=plone.restapi)
        self.loadZCML(package=derico.blicca.promoblock)

    def setUpPloneSite(self, portal):
        """Set up Plone site."""
        self.applyProfile(portal, "derico.blicca.promoblock:default")


FIXTURE = DericoBliccaPromoblockLayer()

INTEGRATION_TESTING = IntegrationTesting(
    bases=(FIXTURE,),
    name="DericoBliccaPromoblockLayer:IntegrationTesting",
)

FUNCTIONAL_TESTING = FunctionalTesting(
    bases=(FIXTURE,),
    name="DericoBliccaPromoblockLayer:FunctionalTesting",
)

ACCEPTANCE_TESTING = FunctionalTesting(
    bases=(FIXTURE, WSGI_SERVER_FIXTURE),
    name="DericoBliccaPromoblockLayer:AcceptanceTesting",
)


# Test credentials
TEST_USER_ID = "testuser"
TEST_USER_NAME = "testuser"
SITE_OWNER_NAME = SITE_OWNER_NAME
SITE_OWNER_PASSWORD = SITE_OWNER_PASSWORD
