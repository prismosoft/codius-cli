import type { Argv } from "yargs"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { Global } from "@opencode-ai/core/global"
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { Filesystem } from "@/util/filesystem"

interface UninstallArgs {
  keepConfig: boolean
  keepData: boolean
  dryRun: boolean
  force: boolean
}

interface RemovalTargets {
  directories: Array<{ path: string; label: string; keep: boolean }>
  shellConfig: string | null
  binary: string | null
}

export const UninstallCommand = {
  command: "uninstall",
  describe: "uninstall Codius and remove all related files",
  builder: (yargs: Argv) =>
    yargs
      .option("keep-config", {
        alias: "c",
        type: "boolean",
        describe: "keep configuration files",
        default: false,
      })
      .option("keep-data", {
        alias: "d",
        type: "boolean",
        describe: "keep session data and snapshots",
        default: false,
      })
      .option("dry-run", {
        type: "boolean",
        describe: "show what would be removed without removing",
        default: false,
      })
      .option("force", {
        alias: "f",
        type: "boolean",
        describe: "skip confirmation prompts",
        default: false,
      }),

  handler: async (args: UninstallArgs) => {
    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    prompts.intro("Uninstall Codius")

    const targets = await collectRemovalTargets(args)
    await showRemovalSummary(targets)

    if (!args.force && !args.dryRun) {
      const confirm = await prompts.confirm({
        message: "Are you sure you want to uninstall Codius?",
        initialValue: false,
      })
      if (!confirm || prompts.isCancel(confirm)) {
        prompts.outro("Cancelled")
        return
      }
    }

    if (args.dryRun) {
      prompts.log.warn("Dry run - no changes made")
      prompts.outro("Done")
      return
    }

    await executeUninstall(targets)
    prompts.outro("Done")
  },
}

async function collectRemovalTargets(args: UninstallArgs): Promise<RemovalTargets> {
  const directories: RemovalTargets["directories"] = [
    { path: Global.Path.data, label: "Data", keep: args.keepData },
    { path: Global.Path.cache, label: "Cache", keep: false },
    { path: Global.Path.config, label: "Config", keep: args.keepConfig },
    { path: Global.Path.state, label: "State", keep: false },
  ]

  const executableName = path.basename(process.execPath).toLowerCase()
  const binary =
    executableName === "codius" ||
    executableName === "codius.exe" ||
    process.execPath.includes(`${path.sep}.codius${path.sep}`)
      ? process.execPath
      : null

  return {
    directories,
    shellConfig: await getShellConfigFile(),
    binary,
  }
}

async function showRemovalSummary(targets: RemovalTargets) {
  prompts.log.message("The following Codius files will be removed:")

  for (const dir of targets.directories) {
    const exists = await fs
      .access(dir.path)
      .then(() => true)
      .catch(() => false)
    if (!exists) continue

    const size = await getDirectorySize(dir.path)
    const status = dir.keep ? `${UI.Style.TEXT_DIM}(keeping)` : ""
    const prefix = dir.keep ? "○" : "✓"
    prompts.log.info(
      `  ${prefix} ${dir.label}: ${shortenPath(dir.path)} ${UI.Style.TEXT_DIM}(${formatSize(size)})${status}`,
    )
  }

  if (targets.binary) prompts.log.info(`  ✓ Binary: ${shortenPath(targets.binary)}`)
  if (targets.shellConfig) {
    prompts.log.info(`  ✓ Shell PATH entry in ${shortenPath(targets.shellConfig)}`)
  }
}

async function executeUninstall(targets: RemovalTargets) {
  const spinner = prompts.spinner()
  const errors: string[] = []

  for (const dir of targets.directories) {
    if (dir.keep) {
      prompts.log.step(`Skipping ${dir.label} (--keep-${dir.label.toLowerCase()})`)
      continue
    }

    const exists = await fs
      .access(dir.path)
      .then(() => true)
      .catch(() => false)
    if (!exists) continue

    spinner.start(`Removing ${dir.label}...`)
    const err = await fs.rm(dir.path, { recursive: true, force: true }).catch((error) => error)
    if (err instanceof Error) {
      spinner.stop(`Failed to remove ${dir.label}`, 1)
      errors.push(`${dir.label}: ${err.message}`)
      continue
    }
    spinner.stop(`Removed ${dir.label}`)
  }

  if (targets.shellConfig) {
    spinner.start("Cleaning shell config...")
    const err = await cleanShellConfig(targets.shellConfig).catch((error) => error)
    if (err instanceof Error) {
      spinner.stop("Failed to clean shell config", 1)
      errors.push(`Shell config: ${err.message}`)
    } else {
      spinner.stop("Cleaned shell config")
    }
  }

  if (targets.binary) {
    UI.empty()
    prompts.log.message("To finish removing the running Codius binary, close this process and run:")
    if (process.platform === "win32") {
      prompts.log.info(`  del /F /Q "${targets.binary}"`)
    } else {
      prompts.log.info(`  rm -f "${targets.binary}"`)
      const binDir = path.dirname(targets.binary)
      if (binDir.includes(`${path.sep}.codius${path.sep}`)) {
        prompts.log.info(`  rmdir "${binDir}" 2>/dev/null || true`)
      }
    }
  }

  if (errors.length > 0) {
    UI.empty()
    prompts.log.warn("Some operations failed:")
    for (const err of errors) prompts.log.error(`  ${err}`)
  }

  UI.empty()
  prompts.log.success("Thank you for using Codius!")
}

async function getShellConfigFile(): Promise<string | null> {
  const shell = path.basename(process.env.SHELL || "bash")
  const home = os.homedir()
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, ".config")

  const configFiles: Record<string, string[]> = {
    fish: [path.join(xdgConfig, "fish", "config.fish")],
    zsh: [
      path.join(home, ".zshrc"),
      path.join(home, ".zshenv"),
      path.join(xdgConfig, "zsh", ".zshrc"),
      path.join(xdgConfig, "zsh", ".zshenv"),
    ],
    bash: [
      path.join(home, ".bashrc"),
      path.join(home, ".bash_profile"),
      path.join(home, ".profile"),
      path.join(xdgConfig, "bash", ".bashrc"),
      path.join(xdgConfig, "bash", ".bash_profile"),
    ],
    ash: [path.join(home, ".ashrc"), path.join(home, ".profile")],
    sh: [path.join(home, ".profile")],
  }

  const candidates = configFiles[shell] ?? configFiles.bash
  for (const file of candidates) {
    const content = await Filesystem.readText(file).catch(() => "")
    if (content.includes("# Codius CLI") || content.includes(".codius/bin")) return file
  }
  return null
}

async function cleanShellConfig(file: string) {
  const lines = (await Filesystem.readText(file)).split("\n")
  const filtered: string[] = []
  let skipNextPathLine = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === "# Codius CLI") {
      skipNextPathLine = true
      continue
    }
    if (skipNextPathLine) {
      skipNextPathLine = false
      if (trimmed.includes(".codius/bin") || trimmed.startsWith("fish_add_path")) continue
    }
    if (
      (trimmed.startsWith("export PATH=") && trimmed.includes(".codius/bin")) ||
      (trimmed.startsWith("fish_add_path") && trimmed.includes(".codius/bin"))
    ) {
      continue
    }
    filtered.push(line)
  }

  while (filtered.length > 0 && filtered.at(-1)?.trim() === "") filtered.pop()
  await Filesystem.write(file, `${filtered.join("\n")}\n`)
}

async function getDirectorySize(dir: string): Promise<number> {
  let total = 0
  const walk = async (current: string): Promise<void> => {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile()) {
        const stat = await fs.stat(full).catch(() => null)
        if (stat) total += stat.size
      }
    }
  }
  await walk(dir)
  return total
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function shortenPath(value: string): string {
  const home = os.homedir()
  return value.startsWith(home) ? value.replace(home, "~") : value
}
