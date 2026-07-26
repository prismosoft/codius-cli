# Codius CLI release checklist

Before publishing a Codius CLI release:

- Run the repository typecheck and test workflows.
- Build `packages/opencode` for every supported native target.
- Verify that each archive contains an executable named `codius` or `codius.exe`.
- Run `codius --version` and `codius acp --help` on Windows, macOS, and Linux.
- Test both `https://devapi.codius.dev/v1` and `https://api.codius.ai/v1` with non-production credentials appropriate to the environment.
- Confirm that `CODIUS_API_KEY` is never embedded in an artifact or log.
- Confirm that the public provider catalog is loaded from a Codius-owned domain.
- Verify that OpenAI, Anthropic, Copilot, OpenCode-compatible, local, and custom providers remain selectable.
- Upload the `codius-<platform>-<arch>` archives to the matching GitHub release.
- Test the root `install` script against the published release before announcing it.
- Preserve the upstream MIT license and attribution notices.
