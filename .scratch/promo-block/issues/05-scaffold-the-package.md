# Build: scaffold `derico.blicca.promoblock`

Type: build
Status: resolved
Blocked by: —

## Question

Create the Python package and wire it into the site checkout.

- **Scaffold with `plonecli`** using the stock `backend_addon` template — the
  contract's `blicca_block_addon` template (§9) is follow-on work and does not
  exist. Do not hand-write the layout.
- **Move the design docs in**, and delete the originals:
  `docs/promoblock/CONTEXT.md` → the package root as `CONTEXT.md` (the
  `plonetheme.derico` convention), `docs/promoblock/adr/` → the package's
  `docs/adr/`, `map.md` + `issues/` → the package's `.scratch/promo-block/`.
- **`pyproject.toml`**: `z3c.autoinclude` target `plone`; depend on `Plone` and
  on `plone.blicca.auroraeditor` with a floor — the block imports
  `plone.blicca.auroraeditor.rendering`, which is versioned by the Python
  distribution and **not** by `block_api`. The two signals are independent and
  this add-on needs both.
- **Browser layer + profiles**: `default` and `uninstall`, with
  `browserlayer.xml` mirrored `remove="True"`, and
  `profile-plone.app.registry:default` as a dependency.
- **mxdev wiring**: add the source to `mx.ini` (dev) and pin it in
  `mx-prod.ini`. Watch the known trap recorded in the site repo: `rev` vs
  `branch` behave differently between the two files.
- Tests run from the site root env: `uv run --no-sync pytest <abs path>` — the
  package's own `.venv` has no pytest.

## Answer

**Scaffolded, wired into dev, and green — the one bullet left open is the
`mx-prod.ini` pin, which cannot be done before the first push.**

**The package.** `plonecli create backend_addon derico.blicca.promoblock`, run
non-interactively (`--defaults` plus `-d` for title, description,
`plone_version=6.0`, `is_headless=false`, author, `github_organization=derico-de`).
It git-inits, and committed as `MrTango <md@derico.de>`. Layout is the standard
`src/derico/blicca/promoblock/` with implicit namespace packages.

**The template already satisfied the whole "browser layer + profiles" bullet** —
nothing was hand-written. Verified verbatim: `IDericoBliccaPromoblockLayer` in
`interfaces.py`; `profiles/default/browserlayer.xml` naming it, mirrored by
`profiles/uninstall/browserlayer.xml` with `remove="True"`; and
`profiles/default/metadata.xml` already carrying
`<dependency>profile-plone.app.registry:default</dependency>`. Same for the
`z3c.autoinclude` `target = "plone"` entry point.

**The one pyproject edit** was the `plone.blicca.auroraeditor>=1.0.0a2` floor —
the same floor `collective.fragmentsblock` uses, and the version currently in
`sources/` (`setup.py`, not `pyproject.toml`: auroraeditor is not a plonecli
package). The comment above it records *why* the floor exists, so nobody later
tries to derive it from `block_api`: `rendering.py` is versioned by the Python
distribution, `block_api` by the registry record, and the two move
independently.

**Docs moved in and originals deleted**, as specified: `CONTEXT.md` to the
package root, `adr/` to `docs/adr/`, and `map.md` + `issues/` to
`.scratch/promo-block/`. `docs/promoblock/` in the site repo is gone. Every
relative link in the moved files was rewritten and then machine-checked — all
resolve, including the map's cross-repo link to the block add-on contract, now
`../../../plone.blicca.auroraeditor/docs/design/...`.

**One thing this ticket did that it did not ask for**, because the move breaks a
documented convention: `docs/agents/issue-tracker.md` says planning artifacts
live in the *assembly* repo, so a future `/wayfinder` session looking for
`.scratch/promo-block/` there would find nothing. A pointer README now sits at
`.scratch/promo-block/README.md` in the site repo naming the new location and
saying why this effort is an exception (the block is a standalone, publishable
add-on whose design docs ship with it).

**Dev wiring is complete and exercised.** `mx.ini` gained
`[derico.blicca.promoblock]` with `url = derico.blicca.promoblock` / `vcs = fs`,
matching the other local sources. Per the site AGENTS.md rule that a source
belongs in *both* places — a package left transitive is silently resolved from
PyPI — `pyproject.toml` gained `derico.blicca.promoblock` in
`[project] dependencies` **and** in `[tool.uv.sources]` as an editable path.
`uv run invoke install-sources` then placed it, and the import resolves to the
checkout, not a copy.

**`mx-prod.ini` is deliberately NOT pinned — this is the trap the ticket warned
about, and it fired.** The package has no remote, the GitHub repository does not
exist, and `gh` is not installed in this environment, so creating and pushing it
is not something this session can do. AGENTS.md is unambiguous: a `rev` is valid
only once the commit is on the remote, because mxdev clones rather than
receives. Writing a local sha there would produce a deploy that fails obscurely.
Instead the section is present **commented out**, carrying the four-step
checklist (create repo → add remote and `git push -u origin main` → uncomment and
set `rev` → `python3 bootstrap.py mx-prod.ini` on the server, because the section
is new), plus the private-vs-public url fork.

Note the consequence honestly: **a `--ini mx-prod.ini` deploy cannot succeed
until that pin lands**, because `pyproject.toml` now depends on the package and
points `[tool.uv.sources]` at a directory mxdev will not create without the
section. This is stated in the file itself. Dev is unaffected. Nothing else in
the map is blocked by it — tickets 06 through 17 are all dev-side.

**Checks.** `uv run --no-sync pytest sources/derico.blicca.promoblock` from the
site root: **3 passed** — the scaffold's install/uninstall tests run against a
real Plone site, so the browser layer and both profiles are exercised, not just
inspected. `ruff check`: clean. `ruff format` reformatted **6 template-generated
files** (blank line after module docstring, under the package's own
`preview = true` config); the template emits them unformatted but
`collective.fragmentsblock` is format-clean and `.pre-commit-config.yaml` runs
`ruff-format`, so the package was normalized to match rather than left to fail
its own first pre-commit run.

### Facts later tickets depend on

- Package root: `sources/derico.blicca.promoblock`; module path
  `src/derico/blicca/promoblock/`; browser layer
  `derico.blicca.promoblock.interfaces.IDericoBliccaPromoblockLayer`.
- Profile version is `1000` in both profiles. **Ticket 12's registry record and
  every later profile XML change needs `plonecli add upgrade_step`** — never a
  hand-edited `metadata.xml`.
- `[tool.plone.backend_addon.settings.subtemplates]` lists `views = []`; ticket
  09's `@@aurora-block-promo` must be scaffolded with `plonecli add view` so it
  registers there, the way fragmentsblock's `aurora-block-fragment` did.
- Tests run **only** from the site root env (`uv run --no-sync pytest <path>`);
  the package has no `.venv` and no `tasks.py` (no `zope-setup` layer), so
  `plonecli test` does not work here.
- Default branch is `main`.
- **Open handoff:** create the GitHub repository and push, then uncomment and pin
  the `mx-prod.ini` section.
