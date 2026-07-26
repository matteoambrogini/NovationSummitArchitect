import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { parseProjectFileContents } from "./projectFiles";

describe("project file import", () => {
  it("reopens a schema-valid exported project", () => {
    const proposal = demoProposals[0]!;
    const now = new Date().toISOString();
    const reopened = parseProjectFileContents(
      JSON.stringify({
        fileFormat: "summit-patch-architect-project",
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
        input: { description: "pluck demo" },
        proposals: [proposal],
        activeProposalId: proposal.proposalId,
      }),
    );
    expect(reopened.activeProposalId).toBe(proposal.proposalId);
  });

  it("rejects malformed and unsupported project files", () => {
    expect(() => parseProjectFileContents("not-json")).toThrow(/JSON valido/);
    expect(() => parseProjectFileContents(JSON.stringify({ version: "9.0.0" }))).toThrow();
  });
});
