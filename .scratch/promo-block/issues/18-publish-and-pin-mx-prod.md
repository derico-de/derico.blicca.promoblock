# Task: publish the package and pin it in `mx-prod.ini`

Type: task
Status: open
Blocked by: —
Repo: derico.de (the assembly repo) + sources/derico.blicca.promoblock

## Question

Give `derico.blicca.promoblock` a remote, push it, and turn the commented
`mx-prod.ini` section into a real pin.

Surfaced by [ticket 05](05-scaffold-the-package.md), which could not do it: the
package was scaffolded locally with no remote, the GitHub repository does not
exist, and `gh` is not installed in the dev environment. AGENTS.md forbids
pinning before pushing — mxdev clones from the remote, so a local-only `rev`
fails the deploy — so the section was left commented with a checklist instead.

**This is HITL for step 1**: creating the repository under `derico-de` needs the
user's GitHub account.

- Create `derico-de/derico.blicca.promoblock`. **Decide public or private** — it
  changes the url spelling. Public gets the plain `https://` url already written
  in `mx-prod.ini`; private needs its own deploy key plus a `github-deploy-promo`
  Host alias in the server's `~/.ssh/config`, like the three existing ones, and
  the url becomes `git@github-deploy-promo:...`. (The package is generic by
  design — derico.de is its first consumer, not its subject — which argues for
  public, alongside `collective.fragmentsblock`. Confirm with the user rather
  than assuming.)
- Add the remote and push `main`.
- Uncomment the `[derico.blicca.promoblock]` section in `mx-prod.ini`, set `rev`
  to the pushed sha, and delete the now-stale checklist comment above it.
- On the server the section is **new**, so the deploy needs the bootstrap pass
  first: `python3 bootstrap.py mx-prod.ini`, then
  `uv run invoke install-sources --ini mx-prod.ini`.

**Until this lands, a `--ini mx-prod.ini` deploy cannot succeed**, because the
site `pyproject.toml` already depends on the package and points
`[tool.uv.sources]` at a directory mxdev will not create without the section.
Dev is unaffected, and no other ticket on this map is blocked by it.

Worth doing **once there is something worth deploying** — the rev is re-pinned on
every deploy anyway, so the natural moment is after
[ticket 12](12-build-registration.md) makes the block actually installable.
Creating the repository and pushing, though, can happen at any time and makes
`mx-prod.ini` honest sooner.

### Note from [ticket 12](12-build-registration.md)

**The natural moment has arrived.** Ticket 12 is resolved, so the block is now
genuinely installable — the record, the `++plone++` resource and the upgrade
step all land on a site — which is the condition this ticket named for pinning
being worth doing. The blocker is unchanged and still HITL: the GitHub
repository does not exist, `gh` is absent, and the site `pyproject.toml`
already depends on the package, so a `--ini mx-prod.ini` deploy stays broken
until the repo is created, pushed and pinned.

Note the server also needs `python3 bootstrap.py mx-prod.ini` before
`install-sources`, because the section is new.

## Answer

<!-- fill in -->
