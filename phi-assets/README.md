# phi-assets

Card templates (`html/**/*.art`), their stylesheets and fonts, plus a bundled
copy of the song catalog (`info/`). The templates started as phi-plugin's
`resources/` (GPL-3.0, see LICENSE) and are maintained here now; nothing is
synced from upstream.

Jackets, avatars, rank icons and the live catalog come from R2, written by
ill-sync and phi-unpackd. `info/` is only the fallback when R2 is unreachable.

After editing a template or stylesheet run `pnpm precompile-art` and
`pnpm bundle-css` (`pnpm dev` and `pnpm build` already do).
