import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { SummitPanel } from "./SummitPanel";

describe("SummitPanel", () => {
  it("renders accessible controls and supports keyboard selection", () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    render(
      <SummitPanel
        proposal={demoProposals[0]!}
        scope="single"
        selectedParameterId={undefined}
        activeDisplayAreaId="osc"
        activeDisplayPage={1}
        selectedDisplayFieldId="diverge"
        activeModulationSlot={1}
        activeFxModulationSlot={1}
        onSelect={onSelect}
        onChange={onChange}
        onDisplayAreaSelect={vi.fn()}
        onDisplayStep={vi.fn()}
        onDisplayFieldSelect={vi.fn()}
        onDisplayValueStep={vi.fn()}
      />,
    );
    const control = screen.getByRole("slider", { name: "Frequency: 185" });
    fireEvent.focus(control);
    fireEvent.keyDown(control, { key: "ArrowUp" });
    expect(onSelect).toHaveBeenCalledWith("filter.frequency");
    expect(onChange).toHaveBeenCalledWith("filter.frequency", 186);
  });
});
