"""Reading the Promo's stored JSON — the Python twin of ``promo/data.ts``.

The degradation table (ticket 03 Q8) is spelled **twice**, once per renderer,
because the two surfaces run in different languages and one scope-wrapped
stylesheet dresses both. This module is the server's spelling; the editor's is
``bundle-src/src/promo/data.ts``. A change to either is a change to both, and
``tests/test_promo_data.py`` reads the TS file to hold the two tables level.

Deliberately free of Plone imports. Everything here is a pure function of one
stored block dict, which is what makes the lockstep test cheap and what keeps
the *rendering* concerns — resolving a reference to a URL, building a
``<picture>``'s base image — in ``views/promo_block_view.py`` where the context
lives.

Two things the TS half carries that this one does not:

- ``storedImage``/``imageSrc``. The canvas has to guess an ``<img src>`` from
  the raw reference because a freshly picked image is not serialized yet
  (ticket 08). The server never guesses: ticket 10's transformer has already
  run, so ``image_url`` is the single source, and its **absence** is that
  ticket's signal for "no image" — including a dangling reference.
- ``missing()``/``warnings()``. Editor honesty, by definition: the public page
  says nothing about what an author typed and the renderers dropped.
"""

import re


#: The two action slots, in sidebar order. "primary" names appearance, not rank.
CTA_SLOTS = ("primary", "secondary")

#: Ticket 03 Q5: a variant that was never stored renders as a button.
DEFAULT_VARIANT = "button"

#: Ticket 03 Q5 / ticket 17 rule 1: no usable placement means "above the copy".
DEFAULT_ALIGN = "center"

#: What the ``align`` widget can produce; anything else is not a placement.
ALIGNMENTS = ("left", "right", "center")

#: The schemes a **link** may carry. An allowlist, not a blocklist: ticket 03
#: Q1 made all three link fields author-typed free text, and a blocklist fails
#: open on the scheme nobody thought of.
LINK_SCHEMES = ("http", "https", "mailto", "tel")

#: ``mailto:`` and ``tel:`` are meaningless as an ``<img src>``. The image field
#: is a free-text surface too — in native Aurora the host ``ImageWidget`` offers
#: a plain URL input (ticket 01) — so it is screened on its own list.
IMAGE_SCHEMES = ("http", "https")

_SCHEME = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.-]*):")


def text(value):
    """A stored value as a stripped string, or ``''``.

    Nothing in the schema is ``required`` (ticket 03 Q5), so every reader here
    has to answer "absent" for anything at all: a half-authored promo must
    save and publish. Stripping is also what makes the template's whitespace
    normalization sound — see ``PromoBlockView.__call__``.
    """
    return value.strip() if isinstance(value, str) else ""


def screen(value, schemes):
    """``value`` if it is a usable URL of an allowed scheme, ``''`` otherwise.

    A value with no scheme at all is a path — site-relative or document-
    relative — and passes. ``//host/x`` is rejected: it is a protocol-relative
    URL wearing a path's clothes, and the schemes it inherits are not screened.

    ``path_of()`` is unusable for this. It reports ``urlparse(url).path``,
    which is truthy for ``mailto:`` and ``tel:``, so it hands back a bare
    address with the scheme stripped. This block is where that documented limit
    becomes a live case rather than a latent one, because its links are typed
    by the author rather than picked from the site.
    """
    raw = text(value)
    if not raw or raw.startswith("//"):
        return ""
    match = _SCHEME.match(raw)
    if match is None:
        return raw
    return raw if match.group(1).lower() in schemes else ""


def screen_link(value):
    """Screen a link field."""
    return screen(value, LINK_SCHEMES)


def screen_image(value):
    """Screen an image URL."""
    return screen(value, IMAGE_SCHEMES)


def label_of(data, slot):
    """Was a label typed into this slot?

    The click rule is keyed on this, not on whether the slot renders — ticket
    03 Q8 row 5.
    """
    return text((data or {}).get(f"cta_{slot}_label"))


def action(data, slot):
    """One rendering action as ``{label, href, variant}``, or ``None``.

    Symmetric on purpose (Q8 rows 2 and 3): a label without a link and a link
    without a label both render nothing, because a button that goes nowhere is
    worse than an absent one.

    A link that FAILS the screen is treated exactly as an absent link. Q8's own
    row 8 said such a link renders "as text, no href"; ticket 17's class table
    then made ``.promo-cta`` conditional on a label **and** a screened link, so
    the text-only shape would emit an element the anatomy says cannot exist —
    and would put back the dead button row 2 exists to remove.
    """
    data = data or {}
    label = label_of(data, slot)
    href = screen_link(data.get(f"cta_{slot}_link"))
    if not label or not href:
        return None
    stored = text(data.get(f"cta_{slot}_variant"))
    return {
        "label": label,
        "href": href,
        "variant": "link" if stored == "link" else DEFAULT_VARIANT,
    }


def actions(data):
    """Every rendering action, in slot order."""
    found = (action(data, slot) for slot in CTA_SLOTS)
    return [entry for entry in found if entry is not None]


def has_any_label(data):
    """Any label typed in either slot — the whole of the click rule's condition."""
    return any(label_of(data, slot) for slot in CTA_SLOTS)


def card_link(data):
    """The card link, or ``''``.

    THE CLICK RULE, spelled once for this surface: any action label present ⇒
    the actions take the clicks and the card link is ignored. Never both, so no
    interactive element is ever nested inside another. A value hidden by a
    label survives on disk untouched and returns when the labels clear.
    """
    if has_any_label(data):
        return ""
    return screen_link((data or {}).get("card_link"))


def image_url(data):
    """The screened ``image_url`` ticket 10 injected, or ``''``.

    The single source, and the single gate. The transformer emits an external
    free-text URL **whole**, so screening here is what covers the image field's
    own free-text surface; and it emits no key at all for a reference whose
    target was deleted, so an absent value draws the no-image layout instead of
    a guaranteed 404.
    """
    return screen_image((data or {}).get("image_url"))


def has_image(data):
    """Is there a picture to place?"""
    return image_url(data) != ""


def effective_align(data):
    """The class modifier's value — the **effective** placement.

    Never the stored one (ticket 17 rule 1). Emitted always, so an image-less
    promo carries ``has--align--center`` and the sheet has one selector family
    rather than two, and no image-presence class is needed anywhere.
    """
    if not has_image(data):
        return DEFAULT_ALIGN
    stored = text((data or {}).get("align"))
    return stored if stored in ALIGNMENTS else DEFAULT_ALIGN
