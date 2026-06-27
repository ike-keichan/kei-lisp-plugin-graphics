# Contributing to kei-lisp-plugin-graphics

Thank you for your interest in contributing! This document explains how to set
up the project locally and the conventions we follow.

## Development environment

### Prerequisites

- **Node.js** 24 or later (see [`.node-version`](./.node-version))
- **[pnpm](https://pnpm.io/)** (the project uses a pnpm lockfile)
- **[nodenv](https://github.com/nodenv/nodenv)** (recommended for Node.js
  version management)

### Setup

```sh
git clone https://github.com/ike-keichan/kei-lisp-plugin-graphics.git
cd kei-lisp-plugin-graphics
pnpm install
```

### Verify your setup

```sh
pnpm typecheck  # Type check (tsc --noEmit)
pnpm check      # Runs format, lint, and spell checks
pnpm test       # Runs the test suite
pnpm build      # Builds for distribution
```

## Project layout

```
src/
└── index.ts                 # Library entry point (named exports)

configs/eslint/              # Per-plugin ESLint configurations
configs/cspell/              # cspell project dictionaries
docs/                        # User-facing reference
examples/                    # Runnable usage examples (tsx)
```

Code modules live as `<DirName>/index.ts`. PascalCase directories are
single classes; lowercase directories group multiple related classes.

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm build`      | Build for distribution (CJS + ESM + types) |
| `pnpm test`       | Run the test suite                         |
| `pnpm test:watch` | Run tests in watch mode                    |
| `pnpm doc`        | Generate API documentation with TypeDoc    |
| `pnpm typecheck`  | Type check (`tsc --noEmit`)                |
| `pnpm check`      | Run all checks (format / lint / spell)     |
| `pnpm fix`        | Auto-fix format and lint issues            |

## Coding conventions

- **TypeScript**: strict mode + `@typescript-eslint/strictTypeChecked`
- **Formatting**: Prettier (run `pnpm fix:format`)
- **Linting**: ESLint flat config with sonarjs / unicorn / security plugins
- **Spell check**: cspell (see [`cspell.json`](./cspell.json))

Before opening a pull request, please run:

```sh
pnpm typecheck && pnpm check && pnpm test && pnpm build
```

## Testing

Tests are co-located with source files as `src/<ClassName>/index.test.ts` and
run with [vitest](https://vitest.dev/). Canvas-dependent tests use
[`happy-dom`](https://github.com/capricorn86/happy-dom) for the DOM /
`HTMLCanvasElement` shims.

Conventions:

- One `describe` block per class (level 1) and per method (level 2)
- `it` descriptions start with a present-tense verb
  (e.g. `"returns t"`, `"throws EvalError"`, `"draws a filled rect"`)
- One assertion per `it` when feasible
- Add a regression test when fixing a bug

## Branch strategy

Each release gets its own **version branch** (`v1.0`, `v1.1`, ...) cut from
`main`. Pull requests targeting the upcoming release land on that branch;
when it is ready the version branch is merged back into `main`, which
triggers the [Release workflow](./.github/workflows/release.yml) and
publishes to npm.

```
feature/* ──┐
fix/*     ──┤── vX.Y (version branch) ──→ main ──→ tag vX.Y.0 + npm publish
chore/*   ──┘
                                          hotfix/* ──→ main (urgent only)
```

| Branch              | Purpose                                             | Lifetime                        |
| ------------------- | --------------------------------------------------- | ------------------------------- |
| `main`              | Latest released state. Always tag-ready             | Permanent                       |
| `vX.Y` (version)    | Integrates the next release's PRs                   | Until release; merged & deleted |
| `feature/*`         | A single logical change targeting the active `vX.Y` | Until merged                    |
| `fix/*` / `chore/*` | Same flow as `feature/*`                            | Until merged                    |
| `hotfix/*`          | Urgent fix targeting `main` directly                | Until merged                    |

### Branch creation responsibilities

| Branch type      | Created by          | When                                                           |
| ---------------- | ------------------- | -------------------------------------------------------------- |
| `vX.Y` (version) | **Maintainer only** | When planning the next release                                 |
| `hotfix/*`       | **Maintainer only** | When a critical bug needs a patch to a released version        |
| `feature/*` etc. | Anyone              | Anytime, branching from the **active version branch** (`vX.Y`) |

If you are unsure which base branch to target, ask in the PR description
or open a draft PR and the maintainer will guide you.

## Pull request guidelines

1. **Branch from the active version branch** (`vX.Y`) and use a
   descriptive branch name (e.g. `feature/add-arc-spec`,
   `fix/stroke-color-parse`).
2. **Keep changes focused** — one logical change per PR.
3. **Update tests** to cover new behavior or regressions.
4. **Update documentation** (`README.md`, `CHANGELOG.md`, `docs/`) when
   public behavior changes.
5. **Pass all checks** (`pnpm typecheck && pnpm check && pnpm test && pnpm build`).
6. **Commit messages** should follow the existing style:
   `<type>: <description>` (e.g. `fix:`, `feat:`, `docs:`, `test:`,
   `refactor:`, `chore:`).
7. **Fill in the PR template** (auto-loaded from
   [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md)).

## Release process

Releases to npm are triggered automatically by pushes to `main`. The
[`Release` workflow](./.github/workflows/release.yml) reads the version
from `package.json`, checks whether a matching `v<version>` tag already
exists, and if not, runs build → check → test → `pnpm publish
--provenance --access public` → creates the `v<version>` tag → creates
a GitHub Release with auto-generated notes. If the tag already exists
the workflow is a no-op, so it is safe to re-trigger.

### Maintainer steps

1. On the version branch (`vX.Y`), update `CHANGELOG.md` — move pending
   entries under a new `## [<new-version>] - <YYYY-MM-DD>` header.
2. Bump `version` in `package.json` to match.
3. Open a PR from the version branch to `main`, review, and merge.
4. The release workflow runs automatically on the resulting `main`
   push. No manual tagging required.

### Required configuration

No GitHub secrets are needed. The release workflow uses npm
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) with
GitHub Actions OIDC for both authentication and provenance attestation.
The required `id-token: write` permission is already set in the
workflow's `permissions` block.

The npm package side must have a trusted publisher configured for this
repository's `release.yml` workflow. Configure it at
**[npmjs.com/package/kei-lisp-plugin-graphics/access](https://www.npmjs.com/package/kei-lisp-plugin-graphics/access)**
→ Trusted Publisher → Add Trusted Publisher, selecting Publisher:
GitHub Actions, this organization/repository, and workflow filename
`release.yml`.

## Reporting issues

When filing a bug report, please include:

- kei-lisp-plugin-graphics version
- kei-lisp version
- Node.js version (for build issues) or browser version (for runtime issues)
- A minimal Lisp snippet that reproduces the issue
- Expected vs. actual behavior

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
