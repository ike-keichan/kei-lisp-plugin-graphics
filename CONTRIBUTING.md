# Contributing to kei-lisp-plugin-graphics

Thank you for your interest in contributing! This document explains how to set
up the project locally and the conventions we follow.

> [!NOTE]
> kei-lisp-plugin-graphics is a personal hobby project. **Issue reports
> (bugs, questions, ideas) are always welcome**, but external pull requests
> are generally **not accepted** — the maintainer implements changes himself.
> If you would like to see something changed, please open an issue and
> discuss it first instead of writing code.
> Also check [docs/non-goals.md](./docs/non-goals.md) — some requests are
> deliberately out of scope.

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
examples/                    # Runnable usage examples (browser, via Vite)
e2e/                         # Real-browser / real-canvas end-to-end checks
lisp/                        # Bundled Lisp pattern files (shipped in the npm package)
```

Code modules live as `<DirName>/index.ts`. PascalCase directories are
single classes; lowercase directories group multiple related classes.

## Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `pnpm build`         | Build for distribution (CJS + ESM + types)  |
| `pnpm test`          | Run the test suite                          |
| `pnpm test:coverage` | Run the test suite with coverage thresholds |
| `pnpm test:watch`    | Run tests in watch mode                     |
| `pnpm e2e`           | Browser E2E (Playwright + real Chromium)    |
| `pnpm screenshot`    | Regenerate docs/assets/basic-drawing.png    |
| `pnpm doc`           | Generate API documentation with TypeDoc     |
| `pnpm typecheck`     | Type check (`tsc --noEmit`)                 |
| `pnpm check`         | Run all checks (format / lint / spell)      |
| `pnpm fix`           | Auto-fix format and lint issues             |

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

kei-lisp-plugin-graphics bundles several features into one minor (or major)
release using **release-line branches** (`v2.0`, `v3.0`, ...), then
merges them into `main` at release time. Patch releases go directly through
`feature/*` PRs to `main`. Emergency fixes use `hotfix/*` PRs to `main`.

```
feature/* ──┐
feature/* ──┤── vX.Y (release line) ──→ main ──→ tag vX.Y.0 ──→ npm
feature/* ──┘                          ↑
                                       │ (vX.Y is kept as a permanent snapshot)
                    feature/* ──→ main (patch releases)
                     hotfix/* ──→ main (emergency fixes)
```

| Branch                | Purpose                                                                                                                               | Lifetime               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `main`                | Latest released state. Always tag-ready                                                                                               | Permanent              |
| `vX.Y` (release line) | Integrates multiple features for the next minor or major release. Retained after release as a snapshot of that minor's released state | Permanent (long-lived) |
| `feature/*`           | A single logical change. Targets the active `vX.Y` for minor/major; targets `main` directly for patch releases                        | Until merged           |
| `hotfix/*`            | Emergency fix targeting `main` directly                                                                                               | Until merged           |

All major / minor lines (`v1.0`, `v1.1`, `v2.0`, `v3.0`, ...) are kept
around as snapshots of their released state. There is no separate
`vX` (bare-major) maintenance branch; the `vX.0` branch doubles as the
v(X).0.x maintenance line. The `release.yml` workflow currently only
fires on pushes to `main`, so backporting a patch to an older line
requires either extending the workflow trigger or publishing manually.

### Branch creation responsibilities

| Branch type           | Created by          | When                                                                                                   |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `vX.Y` (release line) | **Maintainer only** | When planning a minor or major release that bundles 2+ features                                        |
| `hotfix/*`            | **Maintainer only** | When an emergency fix needs to be released immediately                                                 |
| `feature/*`           | Anyone              | Branching from the **active release line** (`vX.Y`) for minor/major, or from `main` for patch releases |

If you are unsure which base branch to target, ask in the PR description
or open a draft PR and the maintainer will guide you.

## Pull request guidelines

1. **Choose the right base branch** and use a descriptive branch name
   (e.g. `feature/add-arc-spec`, `fix/stroke-color-parse`):
   - Minor / major: branch from the **active release line** (`vX.Y`)
   - Patch release: branch from **`main`**
   - Emergency fix: use `hotfix/*` branched from **`main`**
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

#### Minor / major release

1. On the release-line branch (`vX.Y`), update `CHANGELOG.md` —
   move pending entries under a new
   `## [<new-version>] - <YYYY-MM-DD>` header.
2. Bump `version` in `package.json` to match.
3. Open a PR from the release-line branch to `main`, review, and merge.
4. The release workflow runs automatically on the resulting `main`
   push. No manual tagging required.

#### Patch release

1. Branch `feature/<description>` from `main`.
2. Apply changes, update `CHANGELOG.md`, and bump `version` in `package.json`.
3. Open a PR targeting `main`, review, and merge.
4. The release workflow runs automatically.

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
