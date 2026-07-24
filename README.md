<p align="center">
  <a href="https://codius.ai">
    <img src="assets/codius-logo.svg" alt="Codius" width="360" />
  </a>
</p>

<p align="center"><strong>The open-source coding agent for Codius models and every provider you already use.</strong></p>

<p align="center">
  <a href="https://github.com/prismosoft/codius-cli/actions"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/prismosoft/codius-cli/publish.yml?style=flat-square&branch=dev" /></a>
  <a href="https://github.com/prismosoft/codius-cli/blob/dev/LICENSE"><img alt="License" src="https://img.shields.io/github/license/prismosoft/codius-cli?style=flat-square" /></a>
</p>

# Codius CLI

Codius CLI is a terminal coding agent derived from [OpenCode](https://github.com/anomalyco/opencode). It keeps OpenCode's agent loop, terminal UI, tools, sessions, MCP support, and broad provider ecosystem while making **Codius the first-party default provider**.

The executable is:

```bash
codius
```

The Agent Client Protocol entry point used by Codius Desktop is:

```bash
codius acp
```

## Product architecture

```text
Codius Coding Plans
        │
        ▼
Codius API — OpenAI-compatible inference
        ▲
        │
Codius CLI — local coding agent and ACP server
        ▲
        │
Codius Desktop — visual workspace, browser, terminal, Git and worktrees
```

Codius CLI runs locally. File access, shell commands, Git operations, MCP tools, and agent sessions remain on the user's machine. Model requests are sent to the selected provider.

## Codius endpoints

| Environment | Website                  | OpenAI-compatible API          |
| ----------- | ------------------------ | ------------------------------ |
| Development | `https://dev.codius.dev` | `https://devapi.codius.dev/v1` |
| Production  | `https://codius.ai`      | `https://api.codius.ai/v1`     |

Development and prerelease builds default to the development environment. Stable releases default to production. Every endpoint can be overridden with environment variables.

## Installation

Release installers will be published from this repository. During development, build from source:

```bash
git clone https://github.com/prismosoft/codius-cli.git
cd codius-cli
git checkout dev
bun install
bun run --cwd packages/opencode build --single
```

The generated executable is named `codius`.

Once releases are enabled, the supported installer is:

```bash
curl -fsSL https://raw.githubusercontent.com/prismosoft/codius-cli/dev/install | bash
```

## Connect Codius

Create an API key in the Codius dashboard, then use either the interactive provider dialog or an environment variable.

### Interactive

Start Codius:

```bash
codius
```

Open `/connect`, select **Codius**, and paste the API key. The credential is stored locally with the same protected credential store used by the upstream agent.

### Headless, CI, or Codius Desktop

```bash
export CODIUS_API_KEY="codius_..."
codius
```

PowerShell:

```powershell
$env:CODIUS_API_KEY = "codius_..."
codius
```

## Automatic model catalog

At startup, Codius CLI downloads the current Codius provider block from the public integration endpoint:

```text
/integrations/opencode/provider.json?variant=recommended
```

This means the CLI can receive newly qualified Codius models without a binary release. The provider block contains public model metadata only; it does not contain credentials.

The first fresh installation selects a Codius model by default. After a user explicitly selects another provider or model, that preference is retained.

## Provider support

Codius is the default, not the only option. The fork preserves the upstream provider architecture, including API-key providers, subscription-backed providers, custom OpenAI-compatible endpoints, local models, and MCP integrations.

Examples include:

- Codius
- OpenAI and Codex
- Anthropic
- Google and Vertex AI
- Amazon Bedrock
- GitHub Copilot
- OpenRouter
- xAI
- Mistral
- Groq
- custom OpenAI-compatible providers

Provider availability depends on the relevant account, API key, local runtime, and upstream terms.

## Agent Client Protocol

Codius CLI includes an ACP server:

```bash
codius acp --cwd /path/to/project
```

Codius Desktop launches this command and receives:

- streamed assistant and reasoning events;
- model and mode discovery;
- session creation, resume, fork, and listing;
- permission requests;
- MCP server definitions;
- tool and file-operation events.

The desktop application can therefore present Codius as a native provider while still using the mature OpenCode-derived agent runtime.

## Configuration

Codius retains OpenCode-compatible project configuration so existing agent configurations remain usable. Internal compatibility names may continue to appear in configuration schemas while the fork is kept mergeable with upstream.

Useful Codius environment variables:

| Variable                            | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| `CODIUS_API_KEY`                    | Codius API key                                    |
| `CODIUS_ENV`                        | `development` or `production`                     |
| `CODIUS_API_BASE_URL`               | Override the inference API base URL               |
| `CODIUS_WEB_BASE_URL`               | Override the website/control-plane base URL       |
| `CODIUS_PROVIDER_CONFIG_URL`        | Override the public provider-catalog endpoint     |
| `CODIUS_MODEL_CATALOG_VARIANT`      | `recommended`, `all`, or `experimental`           |
| `CODIUS_DEFAULT_MODEL`              | Prefer a specific Codius model on a fresh install |
| `CODIUS_DISABLE_PROVIDER_BOOTSTRAP` | Disable automatic Codius provider injection       |
| `CODIUS_DEBUG_BOOTSTRAP`            | Print provider-bootstrap diagnostics              |

The following upstream-compatible variables remain supported where required by inherited internals and plugins:

```text
OPENCODE_CONFIG
OPENCODE_CONFIG_CONTENT
OPENCODE_CONFIG_DIR
OPENCODE_PERMISSION
```

## Development

Requirements:

- Bun matching the version in the root `package.json`
- Git
- ripgrep

Common commands:

```bash
bun install
bun run dev
bun run typecheck
bun run --cwd packages/opencode test
bun run --cwd packages/opencode build --single
```

Test the Codius provider against development:

```bash
CODIUS_ENV=development \
CODIUS_API_KEY="codius_..." \
bun run dev
```

Test ACP locally:

```bash
CODIUS_ENV=development \
CODIUS_API_KEY="codius_..." \
bun run --cwd packages/opencode src/index.ts acp --cwd "$PWD"
```

## Release and branding policy

Public artifacts from this fork must use:

- product name: **Codius CLI**;
- executable: **`codius`**;
- repository: `prismosoft/codius-cli`;
- production website: `https://codius.ai`;
- production API: `https://api.codius.ai/v1`;
- development website: `https://dev.codius.dev`;
- development API: `https://devapi.codius.dev/v1`.

Runware credentials and routing identifiers belong only in Codius server infrastructure. They must never be embedded in this repository, a release artifact, a desktop application, or a local configuration template.

## Upstream and license

Codius CLI is based on OpenCode and preserves its MIT license and required notices. It is maintained independently by Prismosoft and is not produced by or affiliated with the OpenCode maintainers.

Generic fixes should be contributed upstream when practical so this fork remains maintainable. Codius-specific branding, model bootstrap, account integration, and release infrastructure stay in this repository.

## Related projects

- [Codius](https://github.com/prismosoft/codius) — plans, dashboard, model catalog, metering, billing, and OpenAI-compatible API
- [Codius Desktop](https://github.com/prismosoft/codius-desktop) — desktop workspace that launches `codius acp`
