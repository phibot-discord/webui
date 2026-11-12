# PhiBot WebUI

![Coding with Cursor](https://cwab.nuclearrockstone.xyz/api/badge?name=Cursor&line1=Built+together+with&theme=dark)
![Coding with Claude](https://cwab.nuclearrockstone.xyz/api/badge?name=Claude&line1=Co-engineered+with&theme=dark)

Renders b30/hisb30/Player Info/x30/fc30 in web
Uses [Takumi](https://takumi.kane.tw/) as renderer!

Cloud saving feature from [PhigrosLibrary](https://github.com/7aGiven/PhigrosLibrary)
Artwork and idea from [phi-plugin](https://github.com/Catrong/phi-plugin)

## Development

You need Node 22.19 or newer and pnpm.

1. Run `pnpm install`.
2. Copy `.env.example` to `.env.local` and fill it in.
3. Run `pnpm dev` to start the app. It needs the Cloudflare values from `.env.local`. To work without them, run `pnpm dev:local`, which uses an in-memory store seeded from `data/raw-save.json`.

Run `pnpm verify` to run the typecheck, the linter and the tests, and `pnpm test:coverage` to see test coverage. `pnpm lint` runs the linter alone and `pnpm fmt` formats the code. Pushes to `main` and pull requests run the same three checks on GitHub Actions (`.github/workflows/ci.yml`).

To render a card offline, run `pnpm render-card <kind> [out.jpg]`, where the kind is `b30`, `x30`, `fc30`, `hisb30`, `info` or `song`.

This project is licensed under the [GNU General Public License v3.0](LICENSE).
