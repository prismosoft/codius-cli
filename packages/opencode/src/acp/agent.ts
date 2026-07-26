import {
  RequestError,
  type Agent as ACPAgent,
  type AgentSideConnection,
  type AuthenticateRequest,
  type CancelNotification,
  type CloseSessionRequest,
  type ForkSessionRequest,
  type InitializeRequest,
  type InitializeResponse,
  type ListSessionsRequest,
  type LoadSessionRequest,
  type NewSessionRequest,
  type PromptRequest,
  type ResumeSessionRequest,
  type SetSessionConfigOptionRequest,
  type SetSessionModelRequest,
  type SetSessionModeRequest,
} from "@agentclientprotocol/sdk"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { Effect } from "effect"
import type { OpencodeClient } from "@opencode-ai/sdk/v2"
import * as ACPError from "./error"
import * as ACPService from "./service"

const CODIUS_AUTH_METHOD_ID = "codius-login"

export function init({ sdk: _sdk }: { sdk: OpencodeClient }) {
  return {
    create: (connection: AgentSideConnection) => {
      return new Agent(ACPService.make({ sdk: _sdk, connection }))
    },
  }
}

export class Agent implements ACPAgent {
  constructor(private readonly service: ACPService.Interface) {}

  async initialize(params: InitializeRequest): Promise<InitializeResponse> {
    const response = await run(this.service.initialize(params))
    return {
      ...response,
      agentInfo: {
        ...response.agentInfo,
        name: "Codius",
        version: response.agentInfo?.version ?? InstallationVersion ?? "0.0.0",
      },
      authMethods: response.authMethods?.map((method) => ({
        ...method,
        id: CODIUS_AUTH_METHOD_ID,
        name: "Login with Codius",
        description: "Connect a Codius API key from the terminal",
        _meta:
          params.clientCapabilities?._meta?.["terminal-auth"] === true
            ? {
                ...method._meta,
                "terminal-auth": {
                  command: "codius",
                  args: ["providers", "login", "--provider", "codius"],
                  label: "Codius Login",
                },
              }
            : method._meta,
      })),
    }
  }

  authenticate(params: AuthenticateRequest) {
    const normalized =
      params.methodId === CODIUS_AUTH_METHOD_ID
        ? { ...params, methodId: ACPService.AuthMethodID }
        : params
    return run(this.service.authenticate(normalized))
  }

  newSession(params: NewSessionRequest) {
    return run(this.service.newSession(params))
  }

  loadSession(params: LoadSessionRequest) {
    return run(this.service.loadSession(params))
  }

  listSessions(params: ListSessionsRequest) {
    return run(this.service.listSessions(params))
  }

  resumeSession(params: ResumeSessionRequest) {
    return run(this.service.resumeSession(params))
  }

  closeSession(params: CloseSessionRequest) {
    return run(this.service.closeSession(params))
  }

  unstable_forkSession(params: ForkSessionRequest) {
    return run(this.service.forkSession(params))
  }

  setSessionConfigOption(params: SetSessionConfigOptionRequest) {
    return run(this.service.setSessionConfigOption(params))
  }

  setSessionMode(params: SetSessionModeRequest) {
    return run(this.service.setSessionMode(params))
  }

  unstable_setSessionModel(params: SetSessionModelRequest) {
    return run(this.service.setSessionModel(params))
  }

  prompt(params: PromptRequest) {
    return run(this.service.prompt(params))
  }

  cancel(params: CancelNotification) {
    return run(this.service.cancel(params))
  }
}

function run<A>(effect: Effect.Effect<A, ACPService.Error>) {
  return Effect.runPromise(effect.pipe(Effect.mapError(ACPError.toRequestError))).catch((defect: unknown) => {
    if (defect instanceof RequestError) throw defect
    throw ACPError.toRequestError(ACPError.fromUnknownDefect(defect))
  })
}

export * as ACP from "./agent"
