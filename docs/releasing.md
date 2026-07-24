# Releasing Codius CLI

Codius CLI releases are built by `.github/workflows/codius-release.yml`.

## Stable release

1. Confirm **Codius CLI CI** is green on `dev`.
2. Confirm the production API and provider catalog are available:
   - `https://api.codius.ai/v1`
   - `https://codius.ai/integrations/opencode/provider.json?variant=recommended&auth=connect`
3. Create and push a signed version tag:

   ```bash
   git checkout dev
   git pull --ff-only
   git tag -s v1.0.0 -m "Codius CLI 1.0.0"
   git push origin v1.0.0
   ```

4. The release workflow runs the provider tests and typecheck, builds native binaries, packages public `codius-*` archives, verifies that each archive contains the `codius` executable, and publishes the assets to the GitHub release.
5. Test at least one clean installation with the repository installer before announcing the release.

## Prerelease

Use a SemVer prerelease tag such as `v1.0.0-beta.1`, or dispatch the workflow manually with **prerelease** enabled.

## Security requirements

- Never add a Runware credential, internal model-routing identifier, or Codius server secret to this repository or a release artifact.
- The only user credential consumed by the Codius provider is `CODIUS_API_KEY`.
- Stable builds use `https://api.codius.ai/v1`; development and prerelease testing may explicitly use `https://devapi.codius.dev/v1`.
- Windows and macOS code signing should be added before broad production distribution. Unsigned archives are suitable only for internal or clearly labeled preview releases.
