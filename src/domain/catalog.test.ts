import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import midiCatalog from "../data/summit-midi-catalog.json";
import { aiParameterCatalog, parameterCatalog, validateProposalAgainstCatalog } from "./catalog";

describe("Summit catalogs", () => {
  it("has unique, documented parameter identifiers", () => {
    const ids = parameterCatalog.map((parameter) => parameter.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(parameterCatalog.every((parameter) => Boolean(parameter.documentation.sourceUrl))).toBe(
      true,
    );
  });

  it("accepts all five demo proposals", () => {
    expect(demoProposals).toHaveLength(5);
    for (const proposal of demoProposals)
      expect(validateProposalAgainstCatalog(proposal)).toEqual([]);
  });

  it("rejects invented parameters", () => {
    const proposal = structuredClone(demoProposals[0]!);
    proposal.parts[0]!.panelControls.push({
      parameterId: "osc1.magic",
      value: 127,
      displayValue: "127",
      confidence: 0.1,
      rationale: "Non esiste",
    });
    expect(validateProposalAgainstCatalog(proposal)).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: "Parametro inventato" })]),
    );
  });

  it("enforces numeric ranges and enum values", () => {
    const numeric = structuredClone(demoProposals[0]!);
    numeric.parts[0]!.panelControls.find((item) => item.parameterId === "amp.attack")!.value = 999;
    expect(validateProposalAgainstCatalog(numeric)[0]?.message).toContain("superiore al massimo");

    const enumProposal = structuredClone(demoProposals[0]!);
    enumProposal.parts[0]!.panelControls.find(
      (item) => item.parameterId === "filter.shape",
    )!.value = "Magic";
    expect(validateProposalAgainstCatalog(enumProposal)[0]?.message).toContain("enumerazione");
  });

  it("rejects incorrect menu locations and non-part scopes", () => {
    const wrongPage = structuredClone(demoProposals[0]!);
    wrongPage.parts[0]!.menuSettings.push({
      parameterId: "voice.unison",
      value: "1",
      displayValue: "1",
      confidence: 1,
      rationale: "Fixture con pagina errata",
      menu: "Voice",
      page: 2,
    });
    expect(validateProposalAgainstCatalog(wrongPage)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Menu o pagina non corrispondono al catalogo verificato",
        }),
      ]),
    );

    const globalSetting = structuredClone(demoProposals[0]!);
    globalSetting.parts[0]!.menuSettings.push({
      parameterId: "settings.partAOutput",
      value: "Main",
      displayValue: "Main",
      confidence: 1,
      rationale: "Fixture globale",
      menu: "Settings",
      page: "A",
    });
    expect(validateProposalAgainstCatalog(globalSetting)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Parametro globale non inseribile in una patch" }),
      ]),
    );

    const multiSetting = structuredClone(demoProposals[0]!);
    multiSetting.parts[0]!.menuSettings.push({
      parameterId: "multi.splitPoint",
      value: "C3",
      displayValue: "C3",
      confidence: 1,
      rationale: "Fixture Multi",
      menu: "Multi",
      page: 3,
    });
    expect(validateProposalAgainstCatalog(multiSetting)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Parametro Multi non inseribile nelle impostazioni di una singola Parte",
        }),
      ]),
    );
  });

  it("rejects unknown modulation entities and slots beyond catalog limits", () => {
    const proposal = structuredClone(demoProposals[0]!);
    proposal.parts[0]!.modulationMatrix.push({
      slot: 17,
      sourceA: "banana",
      destination: "filter.magic",
      depth: 0,
      rationale: "Fixture negativa",
    });
    const issues = validateProposalAgainstCatalog(proposal);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Slot Mod Matrix oltre il limite" }),
        expect.objectContaining({ message: "Sorgente non verificata" }),
        expect.objectContaining({ message: "Destinazione non verificata" }),
      ]),
    );
  });

  it("exposes only independently verified parameters and MIDI translations", () => {
    expect(
      aiParameterCatalog.every(
        (parameter) => parameter.aiExposed && parameter.verificationStatus === "verified",
      ),
    ).toBe(true);
    expect(
      midiCatalog.mappings
        .filter((mapping) => mapping.aiUsable)
        .every(
          (mapping) =>
            mapping.verificationStatus === "verified" &&
            mapping.translation.verificationStatus === "verified",
        ),
    ).toBe(true);
  });
});
