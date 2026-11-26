# Contributing

## Development

Requires Node 24 and pnpm 12.

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
```

`pnpm lint` runs [Biome](https://biomejs.dev) for formatting, lint rules, and
import order. Apply its fixes automatically with:

```sh
pnpm lint:fix
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration |
| `chore` | Maintenance that doesn't fit the above |
| `revert` | Reverting a previous commit |

- Write the description in the imperative mood, lowercase, with no trailing period: `fix: drop hop-by-hop headers`.
- Keep the subject line under 72 characters.
- Add a scope when it helps: `feat(proxy): preserve incoming session headers`.
- Mark a breaking change with `!` after the type/scope and explain it in a `BREAKING CHANGE:` footer.

Examples:

```
feat: add project session mode
fix: return 502 when the upstream request fails
docs: document the session modes
chore: pin pnpm to 12.23.0
```

Commit messages are checked by commitlint in a `commit-msg` hook and in CI. Use `git commit --no-verify` only when you have a reason to bypass the hook; CI still checks pull requests.

Staged files are formatted and linted by Biome in a `pre-commit` hook, so a
commit that changes code will have those fixes applied before it is recorded.

## Pull requests

- Keep changes focused and explain the behavior they change.
- Run `pnpm lint` and `pnpm typecheck` before opening a PR.
- Sign off your commits with the Developer Certificate of Origin (DCO):

```sh
git commit -s -m "fix: handle empty request bodies"
```

The sign-off certifies that you wrote the change, or have the right to submit
it, under the project's MIT license. See <https://developercertificate.org>.
