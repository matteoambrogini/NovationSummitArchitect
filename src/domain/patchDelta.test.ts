import { describe, expect, it, vi } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { applyPatchDelta, changedParameterIds } from "./patchDelta";

describe("patch delta", () => {
  it("changes only the declared parameter", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    const base = demoProposals[0]!;
    const result = applyPatchDelta(base, {
      baseProposalId: base.proposalId,
      userInstruction: "Più scura",
      changes: [
        {
          parameterId: "filter.frequency",
          previousValue: 185,
          newValue: 150,
          rationale: "Chiude il filtro.",
        },
      ],
      unchangedStrategy: ["Oscillatori"],
      warnings: [],
    });
    expect(changedParameterIds(base, result)).toEqual(["filter.frequency"]);
    expect(result.parts[0]!.panelControls.find((item) => item.parameterId === "filter.frequency")?.value).toBe(150);
  });

  it("rejects a delta for another proposal", () => {
    expect(() =>
      applyPatchDelta(demoProposals[0]!, {
        baseProposalId: "wrong",
        userInstruction: "test",
        changes: [],
        unchangedStrategy: [],
        warnings: [],
      }),
    ).toThrow(/non appartiene/);
  });
});
