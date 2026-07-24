# Releasing Codius CLI

Codius CLI releases are built by `.github/workflows/codius-release.yml`.

## Stable release

1. Confirm **Codius CLI CI** is green on `dev`.
2. Confirm `https://api.codius.ai/v1` and the production Codius provider catalog are available.
3. Create and push a signed version tag:

   ```bash
   git checkout dev
   git pull --ff-only
   git tag -s v1.0.0 -m "Codius CLI 1.0.0"
   git push origin v1.0.0
   ```

4. The workflow tests, type-checks, builds native binaries, packages public `codius-*` archives, verifies the archives, and publishes them to GitHub Releases.
5. Test a clean installation with the repository installer before announcement.

## Prerelease

Use a SemVer prerelease tag such as `v1.0.0-beta.1`, or dispatch the workflow manually with **prerelease** enabled.

## Security requirements

- Never add Runware credentials, internal routing identifiers, or Codius server secrets to this repository or a release artifact.
- The public provider consumes `CODIUS_API_KEY` only.
- Stable builds use `https://api.codius.ai/v1`; development testing uses `https://devapi.codius.dev/v1`.
- Windows and macOS code signing should be configured before broad production distribution. Unsigned archives are preview artifacts only.
