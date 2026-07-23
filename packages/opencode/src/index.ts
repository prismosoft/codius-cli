import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { existsSync, readFileSync } from "fs"
import path from "path"
import { RunCommand } from "./cli/cmd/run"
import { GenerateCommand } from "./cli/cmd/generate"
import { ProvidersCommand } from "./cli/cmd/providers"
import { AgentCommand } from "./cli/cmd/agent"
import { ModelsCommand } from "./cli/cmd/models"
import { UI } from "./cli/ui"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { Global } from "@opencode-ai/core/global"
import { FormatError } from "./cli/error"
import { ServeCommand } from "./cli/cmd/serve"
import { DebugCommand } from "./cli/cmd/debug"
import { StatsCommand } from "./cli/cmd/stats"
import { McpCommand } from "./cli/cmd/mcp"
import { GithubCommand } from "./cli/cmd/github"
import { ExportCommand } from "./cli/cmd/export"
import { ImportCommand } from "./cli/cmd/import"
import { AttachCommand } from "./cli/cmd/attach"
import { TuiThreadCommand } from "./cli/cmd/tui"
import { AcpCommand } from "./cli/cmd/acp"
import { EOL } from "os"
import { WebCommand } from "./cli/cmd/web"
import { PrCommand } from "./cli/cmd/pr"
import { SessionCommand } from "./cli/cmd/session"
import { DbCommand } from "./cli/cmd/db"
import { errorMessage } from "./util/error"
import { PluginCommand } from "./cli/cmd/plug"
import { Heap } from "./cli/heap"

const args = hideBin(process.argv)

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeJson(base: unknown, override: unknown): unknown {
  if (!isRecord(base) || !isRecord(override)) return override
  const result: JsonRecord = { ...base }
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in result ? mergeJson(result[key], value) : value
  }
  return result
}

function debugBootstrap(message: string) {
  if (process.env.CODIUS_DEBUG_BOOTSTRAP === "1" || process.env.CODIUS_DEBUG_BOOTSTRAP === "true") {
    process.stderr.write(`[codius] ${message}${EOL}`)
  }
}

function readInjectedConfig(): JsonRecord {
  const value = process.env.OPENCODE_CONFIG_CONTENT
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    debugBootstrap("Ignoring invalid OPENCODE_CONFIG_CONTENT while loading the Codius provider")
    return {}
  }
}

function localConfigDeclaresModel(): boolean {
  const names = ["codius.json", "codius.jsonc", "opencode.json", "opencode.jsonc", "config.json"]
  const roots = [process.cwd(), Global.Path.config]
  for (const root of roots) {
    for (const name of names) {
      const file = path.join(root, name)
      if (!existsSync(file)) continue
      try {
        if (/"model"\s*:/.test(readFileSync(file, "utf8"))) return true
      } catch {
        // A config file that cannot be read will be handled by the normal config loader.
      }
    }
  }
  return false
}

function shouldFetchProviderConfig(): boolean {
  if (["1", "true"].includes((process.env.CODIUS_DISABLE_PROVIDER_BOOTSTRAP ?? "").toLowerCase())) return false
  if (args.some((arg) => ["-h", "--help", "-v", "--version", "completion"].includes(arg))) return false
  return true
}

async function bootstrapCodiusProvider() {
  // Never allow inherited OpenCode update logic to replace this fork with an upstream binary.
  process.env.OPENCODE_DISABLE_AUTOUPDATE ??= "1"
  if (!shouldFetchProviderConfig()) return

  const environment = (
    process.env.CODIUS_ENV ?? (InstallationChannel === "latest" ? "production" : "development")
  ).toLowerCase()
  const production = environment === "production" || environment === "prod"
  const webBase = process.env.CODIUS_WEB_BASE_URL ?? (production ? "https://codius.ai" : "https://dev.codius.dev")
  const apiBase =
    process.env.CODIUS_API_BASE_URL ??
    (production ? "https://api.codius.ai/v1" : "https://devapi.codius.dev/v1")
  const variant = ["recommended", "all", "experimental"].includes(
    process.env.CODIUS_MODEL_CATALOG_VARIANT ?? "recommended",
  )
    ? (process.env.CODIUS_MODEL_CATALOG_VARIANT ?? "recommended")
    : "recommended"
  const configUrl =
    process.env.CODIUS_PROVIDER_CONFIG_URL ??
    `${webBase.replace(/\/$/, "")}/integrations/opencode/provider.json?variant=${encodeURIComponent(variant)}&auth=connect`

  try {
    const response = await fetch(configUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": `codius/${InstallationVersion}`,
      },
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(`provider catalog returned HTTP ${response.status}`)

    const remote = (await response.json()) as unknown
    if (!isRecord(remote) || !isRecord(remote.provider) || !isRecord(remote.provider.codius)) {
      throw new Error("provider catalog did not contain provider.codius")
    }

    const provider = remote.provider.codius
    const options = isRecord(provider.options) ? provider.options : {}
    const models = isRecord(provider.models) ? provider.models : {}
    if (Object.keys(models).length === 0) throw new Error("provider catalog contained no Codius models")

    provider.name = "Codius"
    provider.npm = "@ai-sdk/openai-compatible"
    provider.env = Array.from(
      new Set([...(Array.isArray(provider.env) ? provider.env.filter((item): item is string => typeof item === "string") : []), "CODIUS_API_KEY"]),
    )
    provider.options = {
      ...options,
      baseURL: apiBase,
      timeout: false,
      headerTimeout: 120_000,
      chunkTimeout: 120_000,
    }

    const existing = readInjectedConfig()
    const merged = mergeJson(remote, existing) as JsonRecord
    const stateFile = path.join(Global.Path.state, "model.json")
    if (!merged.model && !existsSync(stateFile) && !localConfigDeclaresModel()) {
      const requested = (process.env.CODIUS_DEFAULT_MODEL ?? "").replace(/^codius\//, "")
      const modelIds = Object.keys(models)
      const selected = requested && modelIds.includes(requested) ? requested : modelIds[0]
      if (selected) merged.model = `codius/${selected}`
    }

    process.env.OPENCODE_CONFIG_CONTENT = JSON.stringify(merged)
    debugBootstrap(`Loaded ${Object.keys(models).length} Codius models from ${configUrl}`)
  } catch (error) {
    debugBootstrap(`Codius provider bootstrap failed: ${errorMessage(error)}`)
  }
}

await bootstrapCodiusProvider()

function show(out: string) {
  const text = out.trimStart()
  if (!text.startsWith("codius ")) {
    process.stderr.write(UI.logo() + EOL + EOL)
    process.stderr.write(text + EOL)
    return
  }
  process.stderr.write(out)
}

const cli = yargs(args)
  .parserConfiguration({ "populate--": true })
  .scriptName("codius")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware(async (opts) => {
    if (opts.printLogs) process.env.OPENCODE_PRINT_LOGS = "1"
    if (opts.logLevel) process.env.OPENCODE_LOG_LEVEL = opts.logLevel
    if (opts.pure) process.env.OPENCODE_PURE = "1"

    Heap.start()

    process.env.AGENT = "1"
    process.env.CODIUS = "1"
    process.env.CODIUS_PID = String(process.pid)
    // Compatibility variables retained for inherited plugins and SDK packages.
    process.env.OPENCODE = "1"
    process.env.OPENCODE_PID = String(process.pid)
  })
  .usage("")
  .completion("completion", "generate shell completion script")
  .command(AcpCommand)
  .command(McpCommand)
  .command(TuiThreadCommand)
  .command(AttachCommand)
  .command(RunCommand)
  .command(GenerateCommand)
  .command(DebugCommand)
  .command(ProvidersCommand)
  .command(AgentCommand)
  .command(ServeCommand)
  .command(WebCommand)
  .command(ModelsCommand)
  .command(StatsCommand)
  .command(ExportCommand)
  .command(ImportCommand)
  .command(GithubCommand)
  .command(PrCommand)
  .command(SessionCommand)
  .command(PluginCommand)
  .command(DbCommand)
  .fail((msg, err) => {
    if (
      msg?.startsWith("Unknown argument") ||
      msg?.startsWith("Not enough non-option arguments") ||
      msg?.startsWith("Invalid values:")
    ) {
      if (err) throw err
      cli.showHelp(show)
    }
    if (err) throw err
    process.exit(1)
  })
  .strict()

try {
  if (args.includes("-h") || args.includes("--help")) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
} catch (e) {
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error" + EOL)
    process.stderr.write(errorMessage(e) + EOL)
  }
  process.exitCode = 1
} finally {
  // Some subprocesses don't react properly to SIGTERM and similar signals.
  // Most notably, some docker-container-based MCP servers don't handle such signals unless
  // run using `docker run --init`.
  // Explicitly exit to avoid any hanging subprocesses.
  process.exit()
}
