# Changelog

## 1.0.0a1 (unreleased)

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
