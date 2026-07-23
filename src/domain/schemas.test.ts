import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { summitPatchProposalSchema, summitProjectFileSchema } from "./schemas";

describe("versioned schemas", () => {
  it("accepts schema-compliant demo output", () => {
    expect(summitPatchProposalSchema.parse(demoProposals[0])).toBeDefined();
  });

  it("rejects unsupported project versions", () => {
    const now = new Date().toISOString();
    expect(() =>
      summitProjectFileSchema.parse({
        fileFormat: "summit-patch-architect-project",
        version: "2.0.0",
        createdAt: now,
        updatedAt: now,
        input: { description: "test" },
        proposals: [demoProposals[0]],
        activeProposalId: demoProposals[0]!.proposalId,
      }),
    ).toThrow();
  });

  it("enforces part identifiers and confidence bounds", () => {
    const invalid = structuredClone(demoProposals[0]!) as unknown as Record<string, unknown>;
    const parts = invalid.parts as Array<Record<string, unknown>>;
    parts[0]!.part = "C";
    expect(summitPatchProposalSchema.safeParse(invalid).success).toBe(false);
  });
});
