<p align="center">
  <a href="https://codius.ai"><img src="assets/codius-logo.svg" alt="Codius" width="360" /></a>
</p>

<h1 align="center">Codius CLI</h1>
<p align="center"><strong>An open-source coding agent with Codius as the default provider.</strong></p>

<p align="center">
  <a href="https://github.com/prismosoft/codius-cli/actions/workflows/codius-ci.yml"><img alt="Codius CLI CI" src="https://img.shields.io/github/actions/workflow/status/prismosoft/codius-cli/codius-ci.yml?branch=dev&style=flat-square" /></a>
  <a href="https://github.com/prismosoft/codius-cli/releases"><img alt="Release" src="https://img.shields.io/github/v/release/prismosoft/codius-cli?display_name=tag&style=flat-square" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/prismosoft/codius-cli?style=flat-square" /></a>
</p>

Codius CLI is derived from [OpenCode](https://github.com/anomalyco/opencode). It keeps OpenCode's mature coding loop, terminal UI, file and shell tools, sessions, MCP support, ACP server, and broad provider ecosystem while making Codius the first-party experience.

```bash
codius                 # interactive coding agent
codius acp             # Agent Client Protocol server for Codius Desktop
```

## Product architecture

```text
Codius Coding Plans
        │
        ▼
Codius API — OpenAI-compatible inference
        ▲
        │ HTTPS
        │
Codius CLI — local coding agent and ACP server
        ▲
        │ ACP over local stdio
        │
Codius Desktop — workspaces, Git, terminals and inline browser
```

Repository access, edits, terminal commands, Git operations, MCP tools, and agent sessions execute locally. Only model requests and their selected context are sent to the active model provider.

## Endpoints

| Environment | Website | OpenAI-compatible API |
|---|---|---|
| Development | `https://dev.codius.dev` | `https://devapi.codius.dev/v1` |
| Production | `https://codius.ai` | `https://api.codius.ai/v1` |

Stable builds use production by default. Local, development, and prerelease builds use development unless `CODIUS_ENV=production` is set.

## Install

### Release installer

```bash
curl -fsSL https://raw.githubusercontent.com/prismosoft/codius-cli/dev/install | bash
```

Install a specific release:

```bash
curl -fsSL https://raw.githubusercontent.com/prismosoft/codius-cli/dev/install \
  | bash -s -- --version 1.0.0
```

### Build from source

```bash
git clone https://github.com/prismosoft/codius-cli.git
cd codius-cli
git checkout dev
bun install
bun run --cwd packages/opencode build --single --skip-embed-web-ui
```

## Connect a Codius account

Create an API key in the Codius dashboard. Then start `codius`, open `/connect`, select **Codius**, and paste the key.

For headless use or Codius Desktop:

```bash
export CODIUS_API_KEY="codius_..."
codius
```

PowerShell:

```powershell
$env:CODIUS_API_KEY = "codius_..."
codius
```

## Codius model catalog

Codius CLI loads qualified Codius models from the Codius integration catalog. This allows model availability and routing aliases to change without republishing the CLI. The public catalog contains model metadata only—never user credentials or infrastructure secrets.

On a fresh installation, Codius is selected by default. Once a user selects another provider or model, that explicit preference is retained.

## Other providers

Codius is the default, not a lock-in. The inherited provider architecture remains available for OpenAI/Codex, Anthropic, Google, Vertex AI, Amazon Bedrock, GitHub Copilot, OpenRouter, xAI, Mistral, Groq, local models, and custom OpenAI-compatible endpoints.

Requests made with another provider use that provider's credentials and terms; they are not silently routed through Codius.

## Agent Client Protocol

Codius Desktop launches:

```bash
codius acp
```

The ACP process supplies model and mode discovery, streamed responses, session create/resume/fork/list operations, permission requests, and MCP server integration. This is how Codius Desktop can expose the same local agent with terminal, Git, worktree, and visible inline-browser tools.

## Environment variables

| Variable | Purpose |
|---|---|
| `CODIUS_API_KEY` | Codius API key |
| `CODIUS_ENV` | `development` or `production` |
| `CODIUS_API_BASE_URL` | Override the inference API base URL |
| `CODIUS_WEB_BASE_URL` | Override the website/control-plane URL |
| `CODIUS_PROVIDER_CONFIG_URL` | Override the model-catalog endpoint |
| `CODIUS_MODEL_CATALOG_VARIANT` | `recommended`, `all`, or `experimental` |
| `CODIUS_DEFAULT_MODEL` | Preferred initial Codius model |
| `CODIUS_DISABLE_PROVIDER_BOOTSTRAP` | Disable Codius catalog injection |
| `CODIUS_DEBUG_BOOTSTRAP` | Print provider-bootstrap diagnostics |
| `CODIUS_CONFIG_DIR` | Override the Codius configuration directory |

Some inherited internals continue to accept `OPENCODE_*` compatibility variables so upstream updates can be merged without a permanent repository-wide rename.

## Development

```bash
bun install
bun test packages/opencode/test/codius/bootstrap.test.ts
bun run --cwd packages/opencode typecheck
bun run --cwd packages/opencode build --single --skip-install --skip-embed-web-ui
```

Test against development:

```bash
CODIUS_ENV=development CODIUS_API_KEY="codius_..." bun run dev
```

Permanent validation is defined in `.github/workflows/codius-ci.yml`. Release packaging is defined in `.github/workflows/codius-release.yml`; see [docs/releasing.md](docs/releasing.md).

## Security and privacy

- Never place Codius server credentials, infrastructure-provider keys, or internal routing identifiers in this repository or a release artifact.
- The local agent sends only the context required for the chosen model request.
- Review tool permissions before allowing shell, file-write, MCP, or browser actions.
- Use project ignore rules and secret scanning for repositories containing sensitive data.

## Upstream and license

Codius CLI is an independent fork of OpenCode. It preserves OpenCode's MIT license and required notices and is not produced by or affiliated with the OpenCode maintainers. Generic fixes should be contributed upstream when practical.

Related repositories:

- [Codius](https://github.com/prismosoft/codius) — plans, accounts, billing, model catalog, and OpenAI-compatible API
- [Codius Desktop](https://github.com/prismosoft/codius-desktop) — visual coding workspace that launches `codius acp`
