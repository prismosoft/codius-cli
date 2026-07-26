import type { Hooks, PluginInput } from "@opencode-ai/plugin"

export async function CodiusAuthPlugin(_input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: "codius",
      methods: [
        {
          type: "api",
          label: "Codius API key",
        },
      ],
    },
  }
}
