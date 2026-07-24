import type { Argv } from "yargs"
import { spawn } from "node:child_process"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { errorMessage } from "@/util/error"

const RELEASE_API = "https://api.github.com/repos/prismosoft/codius-cli/releases/latest"
const INSTALL_SCRIPT = "https://raw.githubusercontent.com/prismosoft/codius-cli/dev/install"

type UpgradeMethod = "curl" | "npm" | "pnpm" | "bun" | "brew" | "choco" | "scoop"

async function latestCodiusVersion(): Promise<string> {
  const response = await fetch(RELEASE_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": `codius/${InstallationVersion ?? "0.0.0"}`,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Codius release lookup returned HTTP ${response.status}`)
  const payload = (await response.json()) as { tag_name?: unknown }
  if (typeof payload.tag_name !== "string" || payload.tag_name.length === 0) {
    throw new Error("The latest Codius release did not include a version tag")
  }
  return payload.tag_name.replace(/^v/, "")
}

async function runInstaller(target: string): Promise<void> {
  const response = await fetch(INSTALL_SCRIPT, {
    headers: { "User-Agent": `codius/${InstallationVersion ?? "0.0.0"}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Codius installer download returned HTTP ${response.status}`)
  const script = await response.text()
  const shell =
    process.platform === "win32"
      ? (process.env.CODIUS_GIT_BASH_PATH ?? process.env.OPENCODE_GIT_BASH_PATH ?? "bash")
      : "sh"

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(shell, [], {
      env: { ...process.env, VERSION: target },
      stdio: ["pipe", "inherit", "inherit"],
      windowsHide: true,
    })
    child.once("error", reject)
    child.once("exit", (code) => resolve(code ?? 1))
    child.stdin.end(script)
  })

  if (exitCode !== 0) throw new Error(`Codius installer exited with code ${exitCode}`)
}

export const UpgradeCommand = {
  command: "upgrade [target]",
  describe: "upgrade Codius to the latest or a specific version",
  builder: (yargs: Argv) =>
    yargs
      .positional("target", {
        describe: "version to upgrade to, for ex '0.1.48' or 'v0.1.48'",
        type: "string",
      })
      .option("method", {
        alias: "m",
        describe: "installation method to use",
        type: "string",
        choices: ["curl", "npm", "pnpm", "bun", "brew", "choco", "scoop"] as const,
      }),
  handler: async (args: { target?: string; method?: UpgradeMethod }) => {
    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    prompts.intro("Upgrade Codius")

    const method = args.method ?? "curl"
    if (method !== "curl") {
      prompts.log.error(
        `Codius self-upgrade currently supports installer releases only. Re-run with --method curl.`,
      )
      prompts.outro("No changes made")
      return
    }

    let target: string
    try {
      target = args.target ? args.target.replace(/^v/, "") : await latestCodiusVersion()
    } catch (error) {
      prompts.log.error(errorMessage(error))
      prompts.outro("Upgrade failed")
      return
    }

    if (!/^\d+\.\d+\.\d+(?:[-.][0-9A-Za-z.-]+)?$/.test(target)) {
      prompts.log.error(`Invalid Codius version: ${target}`)
      prompts.outro("Upgrade failed")
      return
    }

    if (InstallationVersion === target) {
      prompts.log.warn(`Codius upgrade skipped: ${target} is already installed`)
      prompts.outro("Done")
      return
    }

    prompts.log.info(`From ${InstallationVersion ?? "unknown"} → ${target}`)
    const spinner = prompts.spinner()
    spinner.start("Upgrading Codius...")
    try {
      await runInstaller(target)
      spinner.stop("Upgrade complete")
      prompts.outro("Done")
    } catch (error) {
      spinner.stop("Upgrade failed", 1)
      prompts.log.error(errorMessage(error))
      prompts.outro("No changes completed")
    }
  },
}
