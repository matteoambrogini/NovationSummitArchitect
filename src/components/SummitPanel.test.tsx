import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { SummitPanel } from "./SummitPanel";

describe("SummitPanel", () => {
  it("renders accessible controls and supports keyboard selection", () => {
    const onSelect = vi.fn();
    render(
      <SummitPanel
        proposal={demoProposals[0]!}
        selectedParameterId={undefined}
        onSelect={onSelect}
      />,
    );
    const control = screen.getByRole("button", { name: "Frequency: 185" });
    fireEvent.keyDown(control, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("filter.frequency");
  });
});
