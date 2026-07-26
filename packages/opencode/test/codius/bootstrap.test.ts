import { describe, expect, test } from "bun:test"
import {
  mergeCodiusConfig,
  resolveCodiusEndpoints,
  resolveCodiusEnvironment,
  selectInitialCodiusModel,
} from "@/codius/bootstrap"

describe("Codius provider bootstrap", () => {
  test("uses development endpoints for local, dev, and beta builds", () => {
    expect(resolveCodiusEnvironment(undefined, "local")).toBe("development")
    expect(resolveCodiusEnvironment(undefined, "dev")).toBe("development")
    expect(resolveCodiusEnvironment(undefined, "beta")).toBe("development")

    const endpoints = resolveCodiusEndpoints({}, "beta")
    expect(endpoints.website).toBe("https://dev.codius.dev")
    expect(endpoints.api).toBe("https://devapi.codius.dev/v1")
    expect(endpoints.providerConfig).toBe(
      "https://dev.codius.dev/integrations/opencode/provider.json?variant=recommended&auth=connect",
    )
  })

  test("uses production endpoints for stable releases", () => {
    const endpoints = resolveCodiusEndpoints({}, "latest")
    expect(endpoints.environment).toBe("production")
    expect(endpoints.website).toBe("https://codius.ai")
    expect(endpoints.api).toBe("https://api.codius.ai/v1")
  })

  test("honors endpoint and catalog overrides", () => {
    const endpoints = resolveCodiusEndpoints(
      {
        CODIUS_ENV: "production",
        CODIUS_WEB_BASE_URL: "https://console.example.test/",
        CODIUS_API_BASE_URL: "https://api.example.test/v1/",
        CODIUS_PROVIDER_CONFIG_URL: "https://catalog.example.test/provider.json",
        CODIUS_MODEL_CATALOG_VARIANT: "experimental",
      },
      "local",
    )

    expect(endpoints.website).toBe("https://console.example.test")
    expect(endpoints.api).toBe("https://api.example.test/v1")
    expect(endpoints.providerConfig).toBe("https://catalog.example.test/provider.json")
    expect(endpoints.variant).toBe("experimental")
  })

  test("deep-merges an existing user config over the generated provider config", () => {
    expect(
      mergeCodiusConfig(
        {
          model: "codius/default",
          provider: {
            codius: {
              options: { baseURL: "https://api.codius.ai/v1", timeout: false },
              models: { default: { name: "Default" } },
            },
          },
        },
        {
          provider: {
            codius: {
              options: { baseURL: "http://localhost:9000/v1" },
            },
          },
        },
      ),
    ).toEqual({
      model: "codius/default",
      provider: {
        codius: {
          options: { baseURL: "http://localhost:9000/v1", timeout: false },
          models: { default: { name: "Default" } },
        },
      },
    })
  })

  test("selects an explicit valid Codius model and otherwise uses catalog order", () => {
    const models = ["fast", "pro"]
    expect(selectInitialCodiusModel(models, "codius/pro")).toBe("pro")
    expect(selectInitialCodiusModel(models, "missing")).toBe("fast")
    expect(selectInitialCodiusModel([], undefined)).toBeUndefined()
  })
})
