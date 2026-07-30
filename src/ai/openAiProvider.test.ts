import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSetting } from "../domain/patchUi";
import { OpenAiPatchProvider } from "./openAiProvider";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function generation(value: number) {
  return {
    schemaVersion: "1.0.0",
    patchName: "AI Pluck",
    category: "pluck",
    description: "Pluck OpenAI validato.",
    soundAnalysis: {
      role: "pluck",
      brightness: 0.8,
      movement: 0.3,
      width: 0.5,
      attackCharacter: "rapido",
      sustainCharacter: "breve",
      transientCharacter: "netto",
      harmonicCharacter: "brillante",
      spatialCharacter: "controllato",
    },
    settings: [
      {
        parameterId: "filter.frequency",
        value,
        rationale: "Controlla la brillantezza.",
        confidence: 0.9,
      },
    ],
    modulationSlots: [],
    fxModulationSlots: [],
    sectionConfidence: [
      { section: "filter", confidence: 0.9, reason: "Cutoff coerente con il prompt." },
    ],
    assumptions: [],
    warnings: [],
    summary: "Delta minimo per un pluck brillante.",
  };
}

function response(value: number, requestId: string) {
  return {
    generation: generation(value),
    metadata: {
      requestId,
      model: "gpt-5.4-mini",
      durationMilliseconds: 50,
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    },
  };
}

describe("OpenAI provider validation and repair", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      value: {},
      configurable: true,
    });
  });

  it("repairs one invalid structured response before applying it", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(response(999, "resp_invalid"))
      .mockResolvedValueOnce(response(175, "resp_repaired"));

    const result = await new OpenAiPatchProvider().generate({
      description: "Pluck brillante e breve",
      mode: "text",
    });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(getSetting(result.proposal, "filter.frequency", "single")?.value).toBe(175);
    expect(result.insight.repaired).toBe(true);
    expect(result.insight.partial).toBe(false);
    expect(result.insight.metadata?.requestId).toBe("resp_repaired");
  });

  it("uses a safe partial patch when repair also fails local validation", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(response(999, "resp_invalid"))
      .mockResolvedValueOnce(response(998, "resp_invalid_repair"));

    const result = await new OpenAiPatchProvider().generate({
      description: "Pluck brillante e breve",
      mode: "text",
    });

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(getSetting(result.proposal, "filter.frequency", "single")?.value).not.toBe(999);
    expect(result.insight.partial).toBe(true);
    expect(result.insight.warnings.join(" ")).toMatch(/solo le impostazioni locali valide/i);
  });
});
