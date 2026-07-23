import { describe, expect, it } from "vitest";
import { validateProposalAgainstCatalog } from "../domain/catalog";
import { MockPatchProvider } from "./mockProvider";

describe("mock provider", () => {
  it("falls back to a safe demo without credentials", async () => {
    const provider = new MockPatchProvider();
    const proposal = await provider.generate({
      description: "suono non classificato",
      mode: "text",
    });
    expect(provider.requiresCredentials).toBe(false);
    expect(proposal.patch.name).toBe("Aurora Pluck");
    expect(validateProposalAgainstCatalog(proposal)).toEqual([]);
  });

  it("returns a minimal refinement delta", async () => {
    const provider = new MockPatchProvider();
    const proposal = await provider.generate({ description: "dark reese bass", mode: "text" });
    const delta = await provider.refine(proposal, "Più largo senza indebolire il centro");
    expect(delta.changes).toHaveLength(1);
    expect(delta.changes[0]?.parameterId).toBe("fx.chorus.level");
  });
});
