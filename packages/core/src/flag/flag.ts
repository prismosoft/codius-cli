import { Config } from "effect"

const codiusCompatibilityKeys = [
  "AUTO_HEAP_SNAPSHOT",
  "GIT_BASH_PATH",
  "CONFIG",
  "CONFIG_CONTENT",
  "CONFIG_DIR",
  "DISABLE_AUTOUPDATE",
  "ALWAYS_NOTIFY_UPDATE",
  "DISABLE_PRUNE",
  "DISABLE_TERMINAL_TITLE",
  "SHOW_TTFD",
  "DISABLE_AUTOCOMPACT",
  "DISABLE_MODELS_FETCH",
  "DISABLE_MOUSE",
  "DISABLE_FFF",
  "FAKE_VCS",
  "SERVER_PASSWORD",
  "SERVER_USERNAME",
  "EXPERIMENTAL",
  "EXPERIMENTAL_FILEWATCHER",
  "EXPERIMENTAL_DISABLE_FILEWATCHER",
  "EXPERIMENTAL_DISABLE_COPY_ON_SELECT",
  "EXPERIMENTAL_WORKSPACES",
  "EXPERIMENTAL_REFERENCES",
  "MODELS_URL",
  "MODELS_PATH",
  "DB",
  "WORKSPACE_ID",
  "DISABLE_PROJECT_CONFIG",
  "TUI_CONFIG",
  "PURE",
  "PERMISSION",
  "PLUGIN_META_FILE",
  "CLIENT",
] as const

for (const suffix of codiusCompatibilityKeys) {
  const codiusKey = `CODIUS_${suffix}`
  const opencodeKey = `OPENCODE_${suffix}`
  if (process.env[opencodeKey] === undefined && process.env[codiusKey] !== undefined) {
    process.env[opencodeKey] = process.env[codiusKey]
  }
}

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["OPENCODE_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("OPENCODE_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  OPENCODE_AUTO_HEAP_SNAPSHOT: truthy("OPENCODE_AUTO_HEAP_SNAPSHOT"),
  OPENCODE_GIT_BASH_PATH: process.env["OPENCODE_GIT_BASH_PATH"],
  OPENCODE_ALWAYS_NOTIFY_UPDATE: truthy("OPENCODE_ALWAYS_NOTIFY_UPDATE"),
  OPENCODE_DISABLE_PRUNE: truthy("OPENCODE_DISABLE_PRUNE"),
  OPENCODE_DISABLE_TERMINAL_TITLE: truthy("OPENCODE_DISABLE_TERMINAL_TITLE"),
  OPENCODE_SHOW_TTFD: truthy("OPENCODE_SHOW_TTFD"),
  OPENCODE_DISABLE_AUTOCOMPACT: truthy("OPENCODE_DISABLE_AUTOCOMPACT"),
  OPENCODE_DISABLE_MODELS_FETCH: truthy("OPENCODE_DISABLE_MODELS_FETCH"),
  OPENCODE_DISABLE_MOUSE: truthy("OPENCODE_DISABLE_MOUSE"),
  OPENCODE_FAKE_VCS: process.env["OPENCODE_FAKE_VCS"],
  OPENCODE_SERVER_PASSWORD: process.env["OPENCODE_SERVER_PASSWORD"],
  OPENCODE_SERVER_USERNAME: process.env["OPENCODE_SERVER_USERNAME"],
  OPENCODE_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("OPENCODE_DISABLE_FFF"),

  // Experimental
  OPENCODE_EXPERIMENTAL_FILEWATCHER: Config.boolean("OPENCODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  OPENCODE_MODELS_URL: process.env["OPENCODE_MODELS_URL"],
  OPENCODE_MODELS_PATH: process.env["OPENCODE_MODELS_PATH"],
  OPENCODE_DB: process.env["OPENCODE_DB"],

  OPENCODE_WORKSPACE_ID: process.env["OPENCODE_WORKSPACE_ID"],
  OPENCODE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("OPENCODE_EXPERIMENTAL_WORKSPACES"),

  // These values are intentionally evaluated at access time. Codius injects its
  // provider catalog before the Config service first reads them.
  get OPENCODE_CONFIG() {
    return process.env["OPENCODE_CONFIG"]
  },
  get OPENCODE_CONFIG_CONTENT() {
    return process.env["OPENCODE_CONFIG_CONTENT"]
  },
  get OPENCODE_DISABLE_AUTOUPDATE() {
    return truthy("OPENCODE_DISABLE_AUTOUPDATE")
  },
  get OPENCODE_DISABLE_PROJECT_CONFIG() {
    return truthy("OPENCODE_DISABLE_PROJECT_CONFIG")
  },
  get OPENCODE_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("OPENCODE_EXPERIMENTAL_REFERENCES")
  },
  get OPENCODE_TUI_CONFIG() {
    return process.env["OPENCODE_TUI_CONFIG"]
  },
  get OPENCODE_CONFIG_DIR() {
    return process.env["OPENCODE_CONFIG_DIR"]
  },
  get OPENCODE_PURE() {
    return truthy("OPENCODE_PURE")
  },
  get OPENCODE_PERMISSION() {
    return process.env["OPENCODE_PERMISSION"]
  },
  get OPENCODE_PLUGIN_META_FILE() {
    return process.env["OPENCODE_PLUGIN_META_FILE"]
  },
  get OPENCODE_CLIENT() {
    return process.env["OPENCODE_CLIENT"] ?? "cli"
  },
}
