import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { parameterCatalog, validateProposalAgainstCatalog } from "./catalog";

describe("Summit catalogs", () => {
  it("has unique, documented parameter identifiers", () => {
    const ids = parameterCatalog.map((parameter) => parameter.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(parameterCatalog.every((parameter) => Boolean(parameter.documentation.sourceUrl))).toBe(true);
  });

  it("accepts all five demo proposals", () => {
    expect(demoProposals).toHaveLength(5);
    for (const proposal of demoProposals) expect(validateProposalAgainstCatalog(proposal)).toEqual([]);
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
    enumProposal.parts[0]!.panelControls.find((item) => item.parameterId === "filter.shape")!.value = "Magic";
    expect(validateProposalAgainstCatalog(enumProposal)[0]?.message).toContain("enumerazione");
  });
});
