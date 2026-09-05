# The Promo block is authored, not referential

The block began as "a teaser, roughly like Volto's highlight block". Both
readings of that were available and they lead to different stored data. A
*teaser* in Plone dereferences a content item: Aurora's `teaser` stores an
`href` plus an `overwrite` flag, and its title, description and image are the
target's unless the author opts out. A *highlight* derives nothing — every
string is typed, and the link, if any, is just a link.

The requested feature list settles it without ambiguity once written down:
optional kicker, title and description; an image that may be absent; two
optional actions with their own labels; image placement; a link that applies
only when there are no actions. None of it needs a target, and the first real
instance — the design's "Erstgespräch vereinbaren" band — is not a summary of
the contact page. It is an invitation that happens to link there. Its subject
is the reader.

Building it as a teaser variant would also have collided head-on: Aurora ships
`@type: "teaser"` titled "Teaser", and block registration is last-wins by
weight (block add-on contract §3.2), so a second one silently replaces the
first for every existing teaser node on every site that installs the add-on.

## Decision

**The Promo is a freely authored block stored under its own `@type: promo`.
It holds no reference to another content item, derives no field from one, and
ships no overwrite mechanism. Reference semantics stay with Aurora's teaser.**

1. **Its own `@type`, and a name that is not "teaser".** `promo` collides with
   nothing in the stack and describes intent rather than layout, so it survives
   the image-left, image-right, centred and image-less cases alike. `teaser` was
   rejected for the registration collision above *and* because the word already
   means "stands in for another content item" to every Plone developer.
   `highlight` was rejected because it is already a Plate text mark rendering
   `<mark>`, a few lines away in the same renderer.

2. **Stored keys borrow Aurora's vocabulary, labels borrow the author's.**
   `head_title`, `title`, `description` on disk — matching Aurora's teaser and
   restapi summaries, so a teaser↔promo migration is a copy — labelled
   "Kicker", "Title", "Description" in the sidebar. Volto's teaser makes the
   same split.

3. **Editing is sidebar-only; the canvas is a preview.** Plone block nodes are
   void Plate nodes, and every block in this ecosystem edits through the
   generated `blockSchema` form. Inline plain-text controls are mechanically
   possible inside the `contentEditable={false}` subtree, but they buy a second
   writer onto the same node — the sidebar already writes straight to it — for
   fields short enough that the form serves them. Rich inline text (the one
   thing Volto's highlight has here) would mean re-solving focus, selection and
   undo inside a void node, which is the cost `derico-hero` declined.

   Rejected consequence, accepted knowingly: the description is plain text. No
   bold, no inline links. The actions carry the links.

4. **Working in Aurora proper is a requirement, not a bonus.** The block is
   published as `@derico/aurora-promo-block` (contract §1.1), so it must be
   self-sufficient in a host that has no Blicca wrapper. Aurora's sidebar
   registers exactly one text control — a single-line input — and `textarea`,
   `select` and `color_picker` are declared with zero implementations; even
   `choices` exists only in the Blicca wrapper. The block therefore **ships its
   own widgets**, registered under namespaced keys (`promo_textarea`,
   `promo_select`) rather than claiming the generic ones. Claiming `textarea`
   would silently fix Aurora's own teaser everywhere — a good change, but as a
   patch upstream, not as a side effect of installing a promo block.

   Two exceptions are taken deliberately: `align`, which cmsui registers
   upstream with icons for exactly `left | right | center`, and the image
   field, which is named `image` **so that field-id resolution hands it the
   host's own image widget** — registered in both hosts, upload included, and
   storing a plain string in each. That inverts `derico-hero`'s rule, which
   avoided the name to protect its own widget; here the host's widget is the
   thing we want.

   AMENDED by ADR 0004: the field keeps that name and the host's widget still
   picks and uploads, but it is reached through a `promo_image` wrapper that
   adds the clear action neither host offers. The schema declares
   `id: 'promo_image'` — the one resolution lane that runs before the field
   name — so nothing about the stored data changes.

5. **Neutral by default; custom properties are the theming API.** The block
   is generic — derico.de is its first consumer, not its subject — so it ships
   **structure** (the placement switch, the rhythm, the image box, the action
   row) and expresses every cosmetic as a custom property declared on the block
   root, with a neutral default. Axes whose default is `none` are declared
   anyway, so a theme wanting a border or a shadow has a hook rather than a
   fight.

   This is forced, not stylistic. The block's stylesheet is `@scope`-wrapped
   and themes ship unlayered CSS, and per ADR 0006 "at equal specificity a
   scoped declaration beats an unscoped one (scope proximity, CSS Cascade 6)" —
   so a theme restyling us with plain selectors *loses* unless it escalates
   specificity. Shipping opinionated cosmetics would therefore not merely be
   presumptuous, it would be obstructive. Properties are declared on the block
   root rather than the shared scope root, and rules are written by descent, so
   generic names inside the block cannot collide with another add-on's — both
   habits taken from `derico-hero`.

   `plonetheme.derico` consequently retunes the block with token lines only,
   which is also what keeps it the token-only layer its own tests enforce. That
   is a happy consequence of the generic design, not its motivation.

6. **Reference cases are evidence, not specification.** derico.de's closing
   call to action — one sentence, a button and a mail link, centred on a tinted
   band — is a Promo with no image, `center` placement, full width and both
   actions, and checking that it reproduces exercises the image-less path
   end to end. A second reference case must exercise `left` placement *with* an
   image, because the two share almost no layout and a block validated only
   against the first would ship a broken row. Neither case may narrow the
   block: where a design wants something the block does not offer, the design
   uses the [[theme seam]] or the block grows an option deliberately.

## Consequences

- **Two blocks will look similar and mean different things.** A site can hold a
  teaser and a promo side by side that render alike. The `@type` is the only
  durable distinction, which is why the glossary leads with it and why the
  sidebar wording must not drift back towards "teaser".
- **No overwrite machinery, and no path to it.** There is no target to fall
  back to, so the whole conditional-fieldset, seed-on-pick, reset-to-target
  apparatus is absent. Adding references later is not this block growing an
  `href`; it is Aurora's teaser growing actions and placement, upstream.
- **Everything is authored, so everything can be left blank.** Nothing is
  `required`; a half-filled promo saves and renders what it has. The renderers
  carry the burden of looking deliberate when a field is missing.
- **The markup exists twice** — a React `view` and a Chameleon template — and
  must emit identical anatomy classes, because one scope-wrapped stylesheet
  dresses both surfaces. `align` is a plain data field rather than a style
  field, so no plugin emits its modifier class; both components emit it
  themselves, and that symmetry is the thing tests must hold.
- **A theme cannot restyle us with ordinary CSS.** Scope proximity means the
  block wins at equal specificity, so the property list *is* the contract: an
  axis nobody thought to expose is one a theme can only reach by escalating
  specificity against us. The list will be wrong at first, and growing it is a
  minor release, not a redesign.
- **Shipping widgets makes the package heavier than a block needs to be.**
  A textarea and a select are carried because the ecosystem lacks them, and
  they become dead weight the day upstream registers its own. They are
  namespaced precisely so that day is a deletion, not a conflict.
- **Free-text links must be screened by the block.** `path_of()` reports
  `urlparse(url).path`, which is truthy for `mailto:` and `tel:` and returns
  them with the scheme stripped. The contact band's secondary action is a
  `mailto:`, so this is the first case, not an edge case.
- **Generic costs a consumer something.** derico.de gets a block that is
  slightly less exactly its design than a brand block would have been, and pays
  for it in token lines. That is the deliberate trade for a package a second
  site can install; the alternative was the single-ecosystem exemption, which
  forecloses npm publication.
- **`center` will be explained more than once.** It means image-above, and it
  is kept because it is Volto's spelling and the only value Aurora's align
  widget draws an icon for. The field description carries the explanation.
