import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import midiCatalog from "../data/summit-midi-catalog.json";
import { summitPatchProposalSchema } from "./schemas";
import {
  aiParameterCatalog,
  catalogTarget,
  getAiParameterCatalog,
  isParameterAiUsable,
  parameterCatalog,
  validateProposalAgainstCatalog,
} from "./catalog";

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

  it("uses Summit firmware 2.1 as the explicit primary catalog target", () => {
    expect(catalogTarget.primaryFirmware).toBe("2.1");
    expect(catalogTarget.supportedFirmware.target).toBe("2.1");
  });

  it("keeps verification independent from firmware applicability", () => {
    const animateAttack = parameterCatalog.find((parameter) => parameter.id === "animate1.attack")!;

    expect(animateAttack.verificationStatus).toBe("verified");
    expect(animateAttack.introducedInFirmware).toBe("2.1");
    expect(isParameterAiUsable(animateAttack, "2.1")).toBe(true);
    expect(isParameterAiUsable(animateAttack, "2.0")).toBe(false);
    expect(getAiParameterCatalog("2.1").some((item) => item.id === animateAttack.id)).toBe(true);
    expect(getAiParameterCatalog("2.0").some((item) => item.id === animateAttack.id)).toBe(false);
  });

  it("never exposes conflict, unverified, or unknown parameters to AI", () => {
    const unsafe = parameterCatalog.filter((parameter) =>
      ["conflict", "unverified", "unknown"].includes(parameter.verificationStatus),
    );

    expect(unsafe.length).toBeGreaterThan(0);
    expect(unsafe.every((parameter) => !isParameterAiUsable(parameter, "2.1"))).toBe(true);
  });

  it("validates firmware-specific menu locations and enum values", () => {
    const legacySpread = structuredClone(demoProposals[0]!);
    legacySpread.parts[0]!.menuSettings.push({
      parameterId: "voice.spread",
      value: 64,
      displayValue: "64",
      confidence: 1,
      rationale: "Posizione Voice precedente al firmware 2.1",
      menu: "Voice",
      page: 1,
    });
    expect(validateProposalAgainstCatalog(legacySpread, "1.1")).toEqual([]);
    expect(validateProposalAgainstCatalog(legacySpread, "2.1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Menu o pagina non corrispondono al catalogo verificato",
        }),
      ]),
    );

    const firmwareEnum = structuredClone(demoProposals[0]!);
    firmwareEnum.parts[0]!.panelControls.push({
      parameterId: "arp.type",
      value: "Chord 2",
      displayValue: "Chord 2",
      confidence: 1,
      rationale: "Modalità introdotta dal firmware 2.1",
    });
    expect(validateProposalAgainstCatalog(firmwareEnum, "2.1")).toEqual([]);
    expect(validateProposalAgainstCatalog(firmwareEnum, "1.1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Valore Chord 2 non disponibile nel firmware 1.1",
        }),
      ]),
    );
  });

  it("filters firmware 2.1 modulation additions for earlier targets", () => {
    const proposal = structuredClone(demoProposals[0]!);
    proposal.parts[0]!.modulationMatrix.push({
      slot: 16,
      sourceA: "noise",
      destination: "voice.panPosition",
      depth: 63,
      rationale: "Sorgente e destinazione ufficiali del firmware 2.1",
    });

    expect(validateProposalAgainstCatalog(proposal, "2.1")).toEqual([]);
    expect(validateProposalAgainstCatalog(proposal, "1.1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Sorgente non verificata" }),
        expect.objectContaining({ message: "Destinazione non verificata" }),
      ]),
    );
  });

  it("keeps attribute-level conflicts usable when the value domain is verified", () => {
    const reverbSize = parameterCatalog.find((parameter) => parameter.id === "fx.reverb.size")!;

    expect(reverbSize.verificationStatus).toBe("verified");
    expect(reverbSize.attributeConflicts?.[0]?.field).toBe("defaultValue");
    expect(isParameterAiUsable(reverbSize, "2.1")).toBe(true);
  });

  it("supports verified Multi setup settings without mixing them into Part settings", () => {
    const proposal = structuredClone(demoProposals[0]!);
    proposal.patch.mode = "multi";
    proposal.multiSetup = {
      panelControls: [
        {
          parameterId: "multi.mode",
          value: "Layer",
          displayValue: "Layer",
          confidence: 1,
          rationale: "Modalità Multi verificata",
        },
      ],
      menuSettings: [
        {
          parameterId: "multi.splitPoint",
          value: "C3",
          displayValue: "C3",
          confidence: 1,
          rationale: "Split point verificato",
          menu: "Multi",
          page: 3,
        },
      ],
    };

    expect(summitPatchProposalSchema.safeParse(proposal).success).toBe(true);
    expect(validateProposalAgainstCatalog(proposal, "2.1")).toEqual([]);

    proposal.multiSetup.menuSettings.push({
      parameterId: "multi.partA.level",
      value: 64,
      displayValue: "64",
      confidence: 0.5,
      rationale: "Dominio non pubblicato",
      menu: "Multi",
      page: 3,
    });
    expect(validateProposalAgainstCatalog(proposal, "2.1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Parametro non verificato o non esposto al provider AI",
        }),
      ]),
    );
  });

  it("classifies MIDI mapping existence separately from translation safety", () => {
    const enumMapping = midiCatalog.mappings.find(
      (mapping) => mapping.id === "voice.mode:primary",
    )!;
    const firmwareMapping = midiCatalog.mappings.find(
      (mapping) => mapping.id === "animate1.attack:primary",
    )!;

    expect(enumMapping.verificationStatus).toBe("verified");
    expect(enumMapping.translation.verificationStatus).toBe("unverified");
    expect(enumMapping.aiUsable).toBe(false);
    expect(firmwareMapping.verificationStatus).toBe("verified");
    expect(firmwareMapping.translation.verificationStatus).toBe("verified");
    expect(firmwareMapping.aiUsable).toBe(true);
  });
});
