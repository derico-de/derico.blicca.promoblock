# `@derico/aurora-promo-block`

The Promo block's Aurora half. This is a real npm package (block add-on
contract §1.1: the editor half belongs to the Aurora ecosystem, Blicca
ownership lives only in the Python package) *and* the source for the bundle
committed into `../src/derico/blicca/promoblock/static/`.

Two consumers, one source:

| consumer | artifact | entry |
| --- | --- | --- |
| Blicca `@@aurora-edit` | the scope-wrapped Plone static bundle, runtime-imported per contract §4 | `install(config)` via `blockAddons` |
| Aurora proper | this npm package, a source dependency | `install(config)` from the app's registry config |

The load-bearing shared surface is `install(config)` plus `edit` and `view`.

## Commands

```bash
pnpm install
pnpm build      # -> ../src/derico/blicca/promoblock/static/promo-block.{js,css,js.map}
pnpm test
pnpm typecheck
```

**Build artifacts are committed and never built at install time.** There is
no Node on the deploy host; rebuild here and commit the result whenever
`src/` changes.

If `pnpm install` fails with a sqlite "disk I/O error", the store is on a
filesystem it cannot lock — use `pnpm install --store-dir /dev/shm/pnpm-store`.

## Why the build looks the way it does

`vite.config.ts` is `collective.fragmentsblock`'s, near-verbatim, because
contract §1.2 fixes most of it: ESM lib output, `esbuild: { jsx: 'automatic' }`
(lib mode's default classic transform crashes at render on the missing global
React), and the eight promised shared modules kept external. They are resolved
in the browser through the `@@aurora-edit` import map to the host's own
facades; one leaking into the bundle means two Reacts and a null hook
dispatcher, so `assertNoSharedInBundle()` fails the build instead.

`build-plugins/scope-wrap.ts` is copied unmodified. Only `scopeRoots` and
`scopeLimit` are configurable and the contract fixes both.

## Why the tests have no facade stubs

`@plone/registry` and `@plone/helpers` are installed for real, at the versions
the host provides. `test/upstream-registry.ts` supplies the thing that
genuinely is not on npm: a registry carrying **Aurora's registrations and no
more**, so a field that only works because the Blicca wrapper registered
something fails here rather than in production.

## The four sidebar widgets

`src/widgets/` registers `promo_textarea`, `promo_select`, `promo_link` and
`promo_image` from `install()`. The first three exist because the ecosystem has
no working
implementation of any of them: `textarea` and `select` are declared in the
widget-type union and implemented by nobody, and `choices` is registered only
by the Blicca wrapper — so a field leaning on it renders a select in
`@@aurora-edit` and a bare text input in Aurora proper. With the Promo edited
from the sidebar only, that is the difference between an authorable block and
single-line inputs everywhere.

**Namespaced keys, always.** `registerWidget` writes into one global
last-wins map, so claiming `textarea` would change every other block's fields
in the host, Aurora's own teaser description included. Repairing that for the
ecosystem is a good idea and an upstream patch — not a side effect of
installing this block.

`promo_link` is the composite one: a text input over a bare string, plus a
Browse disclosure that mounts **the host's own** picker, looked up as
`config.getWidget('object_browser')` and never imported (Blicca's is a
`pat-contentbrowser` island; upstream's calls `useLoaderData`). Free text is
never gated — `mailto:` and `tel:` are typed, not picked, and no host
implements `allowExternals`. A picked item is stored as
`../resolveuid/<UID>`, matching `BliccaImageWidget`, because Blicca's
`apiPath` is `portal.absolute_url()` and persisting a brain's `@id` would
bake the deploy hostname into content.

`promo_image` is the other composite one, and the only widget reached through
a schema **`id`** rather than a `widget` key. The field stays named `image` —
that is the name on disk and the name the server half reads — and
`getWidgetByFieldId(id ?? name)` runs first and unconditionally, so a `widget`
key on it would never be consulted. Declaring `id: 'promo_image'` is the one
lane that outranks the name. The widget wraps `config.getWidget('image')`, so
the host keeps picking and uploading, and adds what neither host offers from a
block-settings form: a label, a thumbnail of what is stored, and a **Clear**
button writing `null`. See ADR 0004.

`test/widgets.test.tsx` mounts all four through `renderField`, a
reproduction of the prop envelope `BlockSettingsFormRenderer` and `Field.tsx`
actually build — the whole schema property spread, `label` from `title`,
`defaultValue` from form state, and **no `value`**, plus no `id` of the
renderer's own, which is why the widgets generate their own control id rather
than trusting `props.id`. (`promo_image`'s `id` arrives with the schema
property spread, which is exactly how the field-id lane reaches it.)
