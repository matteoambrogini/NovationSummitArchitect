import { describe, expect, it } from "vitest";
import { validateProposalAgainstCatalog } from "../domain/catalog";
import { buildDefaultPartSettings, getSetting } from "../domain/patchUi";
import { assembleSummitPatch, GenerationValidationError } from "./patchAssembler";

function generation(value: number) {
  return {
    schemaVersion: "1.0.0",
    patchName: "Bright Pluck",
    category: "pluck",
    description: "Pluck brillante e breve.",
    soundAnalysis: {
      role: "pluck",
      brightness: 0.8,
      movement: 0.25,
      width: 0.55,
      attackCharacter: "rapido",
      sustainCharacter: "breve",
      transientCharacter: "netto",
      harmonicCharacter: "brillante",
      spatialCharacter: "moderatamente ampio",
    },
    settings: [
      {
        parameterId: "filter.frequency",
        value,
        rationale: "Apre il filtro per il carattere brillante.",
        confidence: 0.9,
      },
    ],
    modulationSlots: [],
    fxModulationSlots: [],
    sectionConfidence: [
      { section: "filter", confidence: 0.9, reason: "Il cutoff definisce la brillantezza." },
    ],
    assumptions: ["Init Patch verificata."],
    warnings: ["Verificare il livello all'ascolto."],
    summary: "Pluck brillante costruito da un delta minimo.",
  };
}

describe("AI patch assembler", () => {
  it("applies a catalog-valid delta to a complete deterministic Init patch", () => {
    const assembled = assembleSummitPatch(generation(180), {
      description: "Pluck brillante e breve",
    });
    const defaults = buildDefaultPartSettings();
    expect(assembled.proposal.parts[0]?.panelControls).toHaveLength(defaults.panelControls.length);
    expect(getSetting(assembled.proposal, "filter.frequency", "single")?.value).toBe(180);
    expect(validateProposalAgainstCatalog(assembled.proposal)).toEqual([]);
    expect(assembled.partial).toBe(false);
  });

  it("rejects an invalid value so the provider can request one repair", () => {
    expect(() =>
      assembleSummitPatch(generation(999), {
        description: "Pluck brillante e breve",
      }),
    ).toThrow(GenerationValidationError);
  });

  it("drops only invalid changes in safe partial mode", () => {
    const assembled = assembleSummitPatch(generation(999), {
      description: "Pluck brillante e breve",
      allowPartial: true,
    });
    expect(getSetting(assembled.proposal, "filter.frequency", "single")?.value).not.toBe(999);
    expect(assembled.partial).toBe(true);
    expect(assembled.warnings.join(" ")).toMatch(/Ignorato filter\.frequency/);
    expect(assembled.proposal.setupInstructions).toEqual([]);
    expect(validateProposalAgainstCatalog(assembled.proposal)).toEqual([]);
  });
});
