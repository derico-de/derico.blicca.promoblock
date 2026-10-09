# Changelog

## 1.0.0a3 (unreleased)


- Nothing changed yet.


## 1.0.0a2 (2026-10-10)

- Declare block-api 2.0 for the Plate 53 editor (upgrade step 1002). A 2.0
  host skips every 1.x declaration. The bundle needs no rebuild: it imports
  none of the `platejs` names 2.0 removed.

- The description uses the editor's own `textarea` widget instead of the
  block's `promo_textarea`, which is gone. Needs a plone.blicca.auroraeditor
  that registers `textarea`; with an older one, or in Aurora proper, the
  description is a single-line input.

- Fix CI picture tests to cover both stock and AVIF-capable `plone.namedfile`
  output. AVIF delivery is optional; the released dependency does not yet
  provide it.


## 1.0.0a1 (2026-10-04)

- The promo image offers AVIF: one `<source type="image/avif">` in front of
  the `<img>`, the ladder's twin in the smaller encoding (served on demand
  by Blicca's `@@images`), with the same `sizes`. The upload-format ladder
  stays on the `<img>`, and the editor's renderer keeps `picture > img`.

- The uninstall and upgrade profiles are out of the Add-ons control panel
  again. `HiddenProfiles` named them all along, but the `INonInstallable`
  utility was never registered in `configure.zcml` — and the panel (and
  `GET /@addons`) only ever sees the class through that registration, so the
  list was inert and `derico.blicca.promoblock.upgrades` was offered as an installable
  add-on of its own. Installing an upgrade profile by hand imports its XML
  without moving the recorded profile version, leaving the site behind what it
  actually has. The test reads the list out of the utility registry now,
  where the control panel reads it, instead of instantiating the class — which
  is why it stayed green through all of this.

- Initial release.
