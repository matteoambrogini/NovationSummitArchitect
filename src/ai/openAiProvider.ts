import { invoke } from "@tauri-apps/api/core";
import { catalogTarget } from "../domain/catalog";
import type { SummitPatchProposal } from "../domain/schemas";
import { buildAiCatalogContext, buildCurrentPatchSummary } from "./catalogContext";
import {
  openAiApplicationErrorSchema,
  tauriGenerationResponseSchema,
  type OpenAiErrorCode,
  type ProviderMetadata,
} from "./contract";
import { assembleSummitPatch, GenerationValidationError, safeInitPatch } from "./patchAssembler";
import type {
  GenerationInsight,
  PatchGenerationRequest,
  PatchGenerationResult,
  PatchProvider,
} from "./provider";

type RepairContext = {
  candidate: unknown;
  validationIssues: string[];
};

type CommandOptions = {
  description: string;
  refinementInstructions?: string;
  targetFirmware: string;
  patchScope: string;
  currentPatchSummary?: ReturnType<typeof buildCurrentPatchSummary>;
  repair?: RepairContext;
};

export class OpenAiProviderError extends Error {
  readonly code: OpenAiErrorCode | "desktop_required" | "invalid_backend_response";
  readonly retryable: boolean;

  constructor(code: OpenAiProviderError["code"], message: string, retryable = false) {
    super(message);
    this.name = "OpenAiProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

function isDesktopRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

function localizedMessage(code: OpenAiErrorCode, fallback: string) {
  const messages: Record<OpenAiErrorCode, string> = {
    missing_api_key: "OPENAI_API_KEY non è configurata nel backend.",
    invalid_request: "La richiesta OpenAI non è valida.",
    authentication: "La configurazione OpenAI non è autenticata.",
    permission_denied: "Il progetto OpenAI non autorizza questa operazione.",
    rate_limit: "Limite di richieste OpenAI raggiunto. Attendi e riprova.",
    insufficient_quota: "Quota o credito OpenAI non sufficienti.",
    model_unavailable: "Il modello OpenAI configurato non è disponibile.",
    network_failure: "Impossibile raggiungere OpenAI. Controlla la connessione.",
    timeout: "La generazione OpenAI ha superato il tempo massimo.",
    refusal: "OpenAI ha rifiutato la richiesta. Riformula la descrizione sonora.",
    incomplete_response: "La risposta OpenAI è incompleta. Riprova con una descrizione più breve.",
    malformed_structured_output: "OpenAI non ha restituito l'output strutturato atteso.",
    provider_unavailable: "OpenAI è temporaneamente non disponibile.",
  };
  return messages[code] || fallback;
}

function normalizeCommandError(error: unknown): OpenAiProviderError {
  const parsed = openAiApplicationErrorSchema.safeParse(error);
  if (parsed.success) {
    return new OpenAiProviderError(
      parsed.data.code,
      localizedMessage(parsed.data.code, parsed.data.message),
      parsed.data.retryable,
    );
  }
  return new OpenAiProviderError(
    "invalid_backend_response",
    "Il backend OpenAI ha restituito un errore non riconosciuto.",
    false,
  );
}

async function invokeGeneration(options: CommandOptions) {
  if (!isDesktopRuntime()) {
    throw new OpenAiProviderError(
      "desktop_required",
      "La generazione OpenAI è disponibile nell'app desktop Tauri.",
      false,
    );
  }
  try {
    const response = await invoke<unknown>("generate_summit_patch", {
      request: {
        description: options.description,
        ...(options.refinementInstructions
          ? { refinementInstructions: options.refinementInstructions }
          : {}),
        targetFirmware: options.targetFirmware,
        patchScope: options.patchScope,
        ...(options.currentPatchSummary
          ? { currentPatchSummary: options.currentPatchSummary }
          : {}),
        providerConfiguration: {},
        catalog: buildAiCatalogContext(options.targetFirmware),
        ...(options.repair ? { repair: options.repair } : {}),
      },
    });
    const parsed = tauriGenerationResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new OpenAiProviderError(
        "invalid_backend_response",
        "Il backend OpenAI ha restituito metadati non validi.",
        false,
      );
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof OpenAiProviderError) throw error;
    throw normalizeCommandError(error);
  }
}

function buildInsight(
  assembled: ReturnType<typeof assembleSummitPatch>,
  metadata: ProviderMetadata,
  repaired: boolean,
  extraWarnings: string[] = [],
): GenerationInsight {
  return {
    provider: "openai",
    summary: assembled.generation.summary,
    soundAnalysis: assembled.generation.soundAnalysis,
    sectionConfidence: assembled.generation.sectionConfidence,
    assumptions: assembled.generation.assumptions,
    warnings: [...assembled.warnings, ...extraWarnings],
    metadata,
    repaired,
    partial: assembled.partial,
  };
}

function safeFallbackResult(
  description: string,
  targetFirmware: string,
  metadata: ProviderMetadata,
  firstCandidate: unknown,
  firstIssues: string[],
  baseProposal?: SummitPatchProposal,
): PatchGenerationResult {
  try {
    const partial = assembleSummitPatch(firstCandidate, {
      description,
      targetFirmware,
      ...(baseProposal ? { baseProposal } : {}),
      allowPartial: true,
    });
    return {
      proposal: partial.proposal,
      insight: buildInsight(partial, metadata, true, [
        "La riparazione automatica non è riuscita: sono state applicate solo le impostazioni locali valide.",
      ]),
    };
  } catch {
    return {
      proposal: safeInitPatch(description, targetFirmware, baseProposal),
      insight: {
        provider: "openai",
        summary: "Risultato AI non applicabile; mantenuta una patch locale sicura.",
        sectionConfidence: [],
        assumptions: [],
        warnings: [
          "La risposta e la riparazione non hanno superato la validazione locale.",
          ...firstIssues.slice(0, 5),
        ],
        metadata,
        repaired: true,
        partial: true,
      },
    };
  }
}

export class OpenAiPatchProvider implements PatchProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";
  readonly requiresCredentials = true;

  async generate(request: PatchGenerationRequest): Promise<PatchGenerationResult> {
    return this.run(request.description, undefined, undefined);
  }

  async refine(proposal: SummitPatchProposal, instruction: string): Promise<PatchGenerationResult> {
    return this.run(proposal.patch.targetSound, instruction, proposal);
  }

  private async run(
    description: string,
    refinementInstructions?: string,
    baseProposal?: SummitPatchProposal,
  ): Promise<PatchGenerationResult> {
    const targetFirmware = baseProposal?.targetFirmware ?? catalogTarget.primaryFirmware;
    const commandOptions: CommandOptions = {
      description,
      targetFirmware,
      patchScope: baseProposal?.patch.mode ?? "single",
      ...(refinementInstructions ? { refinementInstructions } : {}),
      ...(baseProposal
        ? { currentPatchSummary: buildCurrentPatchSummary(baseProposal, targetFirmware) }
        : {}),
    };
    const first = await invokeGeneration(commandOptions);
    try {
      const assembled = assembleSummitPatch(first.generation, {
        description,
        targetFirmware,
        ...(baseProposal ? { baseProposal } : {}),
      });
      return {
        proposal: assembled.proposal,
        insight: buildInsight(assembled, first.metadata, false),
      };
    } catch (error) {
      if (!(error instanceof GenerationValidationError)) throw error;
      try {
        const repaired = await invokeGeneration({
          ...commandOptions,
          repair: {
            candidate: first.generation,
            validationIssues: error.issues,
          },
        });
        const assembled = assembleSummitPatch(repaired.generation, {
          description,
          targetFirmware,
          ...(baseProposal ? { baseProposal } : {}),
        });
        return {
          proposal: assembled.proposal,
          insight: buildInsight(assembled, repaired.metadata, true, [
            "La prima risposta è stata corretta automaticamente prima dell'applicazione.",
          ]),
        };
      } catch (repairError) {
        if (
          repairError instanceof GenerationValidationError ||
          repairError instanceof OpenAiProviderError
        ) {
          return safeFallbackResult(
            description,
            targetFirmware,
            first.metadata,
            first.generation,
            error.issues,
            baseProposal,
          );
        }
        throw repairError;
      }
    }
  }
}
