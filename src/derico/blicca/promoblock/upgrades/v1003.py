"""Delete the block_api record."""

import logging

from plone.blicca.auroraeditor.blockaddons import BLOCKADDON_PREFIX
from plone.registry.interfaces import IRegistry
from zope.component import getUtility


logger = logging.getLogger(__name__)

#: This add-on's own record name, spelled here rather than imported: a
#: rename would otherwise silently stop this step from finding its orphan.
RECORD_NAME = "derico.blicca.promoblock.promo"


def upgrade(context):
    """Delete this add-on's own orphaned block_api record (ADR 0024)."""
    logger.info("Running upgrade step: Delete the block_api record")
    key = f"{BLOCKADDON_PREFIX}/{RECORD_NAME}.block_api"
    records = getUtility(IRegistry).records
    if key in records:
        del records[key]
        logger.info("Deleted %s.", key)
