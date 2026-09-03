"""The Promo block's identity, spelled once.

``promo`` is the block's ``@type``. Every surface that names the block derives
its own spelling from this constant: the serialization transformers
(``image_transform``), the renderer view name
(``aurora-block-<PROMO_BLOCK_TYPE>``), and the registry record ticket 12
writes. Deliberately NOT ``teaser`` (Aurora ships one; registration is
last-wins by weight and would replace it silently) and NOT ``highlight``
(already a Plate text mark rendering ``<mark>`` in the same renderer).
"""

PROMO_BLOCK_TYPE = "promo"
