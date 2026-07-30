import { describe, expect, it } from "vitest";
import { validateProposalAgainstCatalog } from "../domain/catalog";
import { MockPatchProvider } from "./mockProvider";

describe("mock provider", () => {
  it("falls back to a safe demo without credentials", async () => {
    const provider = new MockPatchProvider();
    const result = await provider.generate({
      description: "suono non classificato",
      mode: "text",
    });
    expect(provider.requiresCredentials).toBe(false);
    expect(result.proposal.patch.name).toBe("Prog House Plk");
    expect(validateProposalAgainstCatalog(result.proposal)).toEqual([]);
  });

  it("returns a minimal refinement delta", async () => {
    const provider = new MockPatchProvider();
    const result = await provider.generate({ description: "dark reese bass", mode: "text" });
    const refined = await provider.refine(result.proposal, "Più largo senza indebolire il centro");
    const before = result.proposal.parts[0]?.panelControls.find(
      (setting) => setting.parameterId === "fx.chorus.level",
    )?.value;
    const after = refined.proposal.parts[0]?.panelControls.find(
      (setting) => setting.parameterId === "fx.chorus.level",
    )?.value;
    expect(after).not.toBe(before);
  });
});
