## Learned User Preferences

- Root README should target end users; maintainer publishing, CI, and local dev workflows belong in a root-level `wide-events-*.md` linked from the README.
- Docker usage docs should assume readers pull a publisher-built image; the Docker Hub namespace in examples is the publisher’s account or organization, not a placeholder each reader replaces with their own.
- Package-facing npm documentation should emphasize installable surfaces (`@wide-events/sdk`, `@wide-events/client`, `@wide-events/collector`); do not present `@wide-events/internal` as something app developers install on purpose.
- For a transitive-only workspace package, a minimal README stub is fine; keep the license file in published tarballs when the package is AGPL or similarly copyleft.

## Learned Workspace Facts

- Monorepo uses pnpm workspaces under `packages/*`; npm releases use Changesets (`pnpm changeset`, `pnpm version-packages`, `pnpm release`).
- Collector Docker builds from the repo root with `-f packages/collector/Dockerfile`; CI publishes to Docker Hub using `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, semver tags from `v*` git tags, and an additional `sha-*` tag on manual workflow dispatch; published images are linux/amd64.
- When shipping both npm and Docker, keep `@wide-events/collector` package version and Docker image semver tags aligned for the same release.
- `@wide-events/internal` holds shared contracts and schema utilities; `sdk`, `client`, and `collector` depend on it via `workspace:*` and must stay in sync with its types and helpers.
- TypeScript build output belongs under `dist/`; compiled artifacts under `src/` are not intentional and should be removed; avoid tooling that emits next to sources.
