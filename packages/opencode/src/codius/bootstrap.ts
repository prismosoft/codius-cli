import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { EOL } from "node:os"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { Global } from "@opencode-ai/core/global"
import { errorMessage } from "@/util/error"

export type CodiusEnvironment = "development" | "production"
export type JsonRecord = Record<string, unknown>

export interface CodiusEndpoints {
  environment: CodiusEnvironment
  website: string
  api: string
  providerConfig: string
  variant: "recommended" | "all" | "experimental"
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function mergeCodiusConfig(base: unknown, override: unknown): unknown {
  if (!isJsonRecord(base) || !isJsonRecord(override)) return override
  const result: JsonRecord = { ...base }
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in result ? mergeCodiusConfig(result[key], value) : value
  }
  return result
}

export function resolveCodiusEnvironment(
  value: string | undefined,
  channel: string = InstallationChannel,
): CodiusEnvironment {
  const normalized = (value ?? (channel === "latest" ? "production" : "development")).toLowerCase()
  return normalized === "production" || normalized === "prod" ? "production" : "development"
}

export function resolveCodiusEndpoints(
  env: NodeJS.ProcessEnv = process.env,
  channel: string = InstallationChannel,
): CodiusEndpoints {
  const environment = resolveCodiusEnvironment(env.CODIUS_ENV, channel)
  const production = environment === "production"
  const website = (env.CODIUS_WEB_BASE_URL ?? (production ? "https://codius.ai" : "https://dev.codius.dev")).replace(
    /\/$/,
    "",
  )
  const api = (env.CODIUS_API_BASE_URL ??
    (production ? "https://api.codius.ai/v1" : "https://devapi.codius.dev/v1")).replace(/\/$/, "")
  const requestedVariant = env.CODIUS_MODEL_CATALOG_VARIANT ?? "recommended"
  const variant = ["recommended", "all", "experimental"].includes(requestedVariant)
    ? (requestedVariant as CodiusEndpoints["variant"])
    : "recommended"
  const providerConfig =
    env.CODIUS_PROVIDER_CONFIG_URL ??
    `${website}/integrations/opencode/provider.json?variant=${encodeURIComponent(variant)}&auth=connect`

  return { environment, website, api, providerConfig, variant }
}

export function selectInitialCodiusModel(modelIds: string[], requested: string | undefined): string | undefined {
  const normalized = (requested ?? "").replace(/^codius\//, "")
  if (normalized && modelIds.includes(normalized)) return normalized
  return modelIds[0]
}

function debugBootstrap(message: string, env: NodeJS.ProcessEnv) {
  if (env.CODIUS_DEBUG_BOOTSTRAP === "1" || env.CODIUS_DEBUG_BOOTSTRAP === "true") {
    process.stderr.write(`[codius] ${message}${EOL}`)
  }
}

function readInjectedConfig(env: NodeJS.ProcessEnv): JsonRecord {
  const value = env.OPENCODE_CONFIG_CONTENT
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return isJsonRecord(parsed) ? parsed : {}
  } catch {
    debugBootstrap("Ignoring invalid OPENCODE_CONFIG_CONTENT while loading the Codius provider", env)
    return {}
  }
}

function localConfigDeclaresModel(cwd: string): boolean {
  const names = ["codius.json", "codius.jsonc", "opencode.json", "opencode.jsonc", "config.json"]
  const roots = [cwd, Global.Path.config]
  for (const root of roots) {
    for (const name of names) {
      const file = path.join(root, name)
      if (!existsSync(file)) continue
      try {
        if (/"model"\s*:/.test(readFileSync(file, "utf8"))) return true
      } catch {
        // The normal config loader will report unreadable files with full context.
      }
    }
  }
  return false
}

function shouldFetchProviderConfig(args: string[], env: NodeJS.ProcessEnv): boolean {
  if (["1", "true"].includes((env.CODIUS_DISABLE_PROVIDER_BOOTSTRAP ?? "").toLowerCase())) return false
  if (args.some((arg) => ["-h", "--help", "-v", "--version", "completion"].includes(arg))) return false
  return true
}

export async function bootstrapCodiusProvider(args: string[], env: NodeJS.ProcessEnv = process.env) {
  // Never allow inherited OpenCode update logic to replace this fork with an upstream binary.
  env.OPENCODE_DISABLE_AUTOUPDATE ??= "1"
  if (!shouldFetchProviderConfig(args, env)) return

  const endpoints = resolveCodiusEndpoints(env)

  try {
    const response = await fetch(endpoints.providerConfig, {
      headers: {
        Accept: "application/json",
        "User-Agent": `codius/${InstallationVersion}`,
      },
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(`provider catalog returned HTTP ${response.status}`)

    const remote = (await response.json()) as unknown
    if (!isJsonRecord(remote) || !isJsonRecord(remote.provider) || !isJsonRecord(remote.provider.codius)) {
      throw new Error("provider catalog did not contain provider.codius")
    }

    const provider = remote.provider.codius
    const options = isJsonRecord(provider.options) ? provider.options : {}
    const models = isJsonRecord(provider.models) ? provider.models : {}
    const modelIds = Object.keys(models)
    if (modelIds.length === 0) throw new Error("provider catalog contained no Codius models")

    provider.name = "Codius"
    provider.npm = "@ai-sdk/openai-compatible"
    provider.env = Array.from(
      new Set([
        ...(Array.isArray(provider.env)
          ? provider.env.filter((item): item is string => typeof item === "string")
          : []),
        "CODIUS_API_KEY",
      ]),
    )
    provider.options = {
      ...options,
      baseURL: endpoints.api,
      timeout: false,
      headerTimeout: 120_000,
      chunkTimeout: 120_000,
    }

    const existing = readInjectedConfig(env)
    const merged = mergeCodiusConfig(remote, existing) as JsonRecord
    const stateFile = path.join(Global.Path.state, "model.json")
    if (!merged.model && !existsSync(stateFile) && !localConfigDeclaresModel(process.cwd())) {
      const selected = selectInitialCodiusModel(modelIds, env.CODIUS_DEFAULT_MODEL)
      if (selected) merged.model = `codius/${selected}`
    }

    env.OPENCODE_CONFIG_CONTENT = JSON.stringify(merged)
    debugBootstrap(`Loaded ${modelIds.length} Codius models from ${endpoints.providerConfig}`, env)
  } catch (error) {
    debugBootstrap(`Codius provider bootstrap failed: ${errorMessage(error)}`, env)
  }
}
