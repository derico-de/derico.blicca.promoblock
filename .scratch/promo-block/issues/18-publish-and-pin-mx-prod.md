# Task: publish the package and pin it in `mx-prod.ini`

Type: task
Status: resolved
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

**Done, and the deploy has run.** The package is published, pinned, and the
new-section bootstrap path is proven rather than merely written down.

- **Repository**: `MrTango/derico.blicca.promoblock`, **public**, plain
  `https://` URL, no deploy key and no `github-deploy-*` Host alias. The
  ticket's argument for public won -- the block is generic by design, derico.de
  is its first consumer -- and it sits under `MrTango/` alongside
  `plone.pageletlayout` and `plonetheme.clara`, not under `derico-de/`, which is
  the org reserved for the three private repositories that need deploy keys.
- **Pushed and verified**: `git ls-remote https://...` (no credentials needed,
  which is itself the confirmation that public was the right call) reports
  `refs/heads/main` = `5d85f44`. Every ticket through 16 is on the remote.
- **Pinned**: the section is live and the stale checklist comment is gone.

**The pin was stale and it mattered.** `mx-prod.ini` pinned `cfa654e`, set at
19:04; three commits landed after it, up to 20:52. `cfa654e` predates the
stylesheet ([ticket 11](11-build-the-stylesheet.md)), the derico token line
([ticket 16](16-derico-token-line.md)) and both verified reference cases, so the
pin on file would have deployed an **undressed** promo. Re-pinned to `5d85f44`;
the same pass moved `plonetheme.derico` from `5713e16b` to `2b1600f`, which is
the commit carrying ticket 16's `derico.css` §9. Both landed in the assembly
repo as `9991b05`.

**The stakes were worse than this ticket stated.** The ticket said a missing
section merely breaks `uv export`, and that "dev is unaffected". True but
under-stated: `plonetheme.derico` now **hard-depends** on the block --
`pyproject` requires `derico.blicca.promoblock>=1.0.0a1` and the theme's default
profile lists `profile-derico.blicca.promoblock:default` -- so a deploy without
this source does not just skip the promo, it **fails to install the theme at
all**. That reasoning is now recorded in the section's own comment, where the
next person re-pinning will read it.

**Bootstrap is proven, not theoretical.** The server has run
`python3 bootstrap.py mx-prod.ini` followed by
`uv run invoke install-sources --ini mx-prod.ini` with the section present, and
it worked. The header comment's two-step recipe for a *new* section is now a
tested path rather than an inference, and no future section needs to rediscover
it.

**Carried forward, deliberately not a ticket.** The deploy that ran installed
`cfa654e` -- the undressed block. The pins now point at `5d85f44` +
`2b1600f`, so the dressed promo and derico's tokens reach the server on the
**next** `install-sources`. That is routine ops on an already-proven path, not a
decision this map owes anyone, so it is recorded here rather than minted as a
ticket. Re-pinning happens on every deploy anyway, which is exactly how this
pin went stale in the first place -- the drift is expected, not a defect.
