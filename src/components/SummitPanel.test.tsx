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
        activeGlobalLfo={3}
        activeModEnvelope={1}
        onSelect={onSelect}
        onChange={onChange}
        onDisplayAreaSelect={vi.fn()}
        onDisplayStep={vi.fn()}
        onDisplayFieldSelect={vi.fn()}
        onDisplayValueStep={vi.fn()}
        onGlobalLfoSelect={vi.fn()}
        onModEnvelopeSelect={vi.fn()}
      />,
    );
    const control = screen.getByRole("slider", { name: "Frequency: 185" });
    fireEvent.focus(control);
    fireEvent.keyDown(control, { key: "ArrowUp" });
    expect(onSelect).toHaveBeenCalledWith("filter.frequency");
    expect(onChange).toHaveBeenCalledWith("filter.frequency", 186);
  });

  it("switches the Global LFO 3/4 context and routes its shared controls", () => {
    const onSelect = vi.fn();
    const onGlobalLfoSelect = vi.fn();
    const commonProps = {
      proposal: demoProposals[0]!,
      scope: "single" as const,
      selectedParameterId: undefined,
      activeDisplayAreaId: "osc",
      activeDisplayPage: 1,
      selectedDisplayFieldId: "diverge",
      activeModulationSlot: 1,
      activeFxModulationSlot: 1,
      activeModEnvelope: 1 as const,
      onSelect,
      onChange: vi.fn(),
      onDisplayAreaSelect: vi.fn(),
      onDisplayStep: vi.fn(),
      onDisplayFieldSelect: vi.fn(),
      onDisplayValueStep: vi.fn(),
      onGlobalLfoSelect,
      onModEnvelopeSelect: vi.fn(),
    };
    const { container, rerender } = render(<SummitPanel {...commonProps} activeGlobalLfo={3} />);

    const selector = container.querySelector<SVGGElement>(
      '[data-control-id="lfo34-select"][aria-label="3 / 4: LFO 3"]',
    );
    expect(selector).not.toBeNull();
    fireEvent.click(selector!);
    expect(onGlobalLfoSelect).toHaveBeenCalledWith(4);

    rerender(<SummitPanel {...commonProps} activeGlobalLfo={4} />);
    expect(
      container.querySelector('[data-control-id="lfo34-select"][aria-label="3 / 4: LFO 4"]'),
    ).not.toBeNull();
    const rate = container.querySelector<SVGGElement>(
      '[data-layout-control-id="lfo34-rate"] [role="slider"]',
    );
    expect(rate).not.toBeNull();
    fireEvent.focus(rate!);
    expect(onSelect).toHaveBeenCalledWith("lfo4.rate");
  });

  it("switches the Mod Envelope 1/2 context and routes its shared controls", () => {
    const onSelect = vi.fn();
    const onModEnvelopeSelect = vi.fn();
    const commonProps = {
      proposal: demoProposals[0]!,
      scope: "single" as const,
      selectedParameterId: undefined,
      activeDisplayAreaId: "osc",
      activeDisplayPage: 1,
      selectedDisplayFieldId: "diverge",
      activeModulationSlot: 1,
      activeFxModulationSlot: 1,
      activeGlobalLfo: 3 as const,
      onSelect,
      onChange: vi.fn(),
      onDisplayAreaSelect: vi.fn(),
      onDisplayStep: vi.fn(),
      onDisplayFieldSelect: vi.fn(),
      onDisplayValueStep: vi.fn(),
      onGlobalLfoSelect: vi.fn(),
      onModEnvelopeSelect,
    };
    const { container, rerender } = render(<SummitPanel {...commonProps} activeModEnvelope={1} />);

    const selector = container.querySelector<SVGGElement>(
      '[data-control-id="mod-envelope-select"][aria-label="1 / 2: Envelope 1"]',
    );
    expect(selector).not.toBeNull();
    fireEvent.click(selector!);
    expect(onModEnvelopeSelect).toHaveBeenCalledWith(2);

    rerender(<SummitPanel {...commonProps} activeModEnvelope={2} />);
    expect(
      container.querySelector(
        '[data-control-id="mod-envelope-select"][aria-label="1 / 2: Envelope 2"]',
      ),
    ).not.toBeNull();
    const attack = container.querySelector<SVGGElement>(
      '[data-layout-control-id="mod-envelope-attack"] [role="slider"]',
    );
    expect(attack).not.toBeNull();
    fireEvent.focus(attack!);
    expect(onSelect).toHaveBeenCalledWith("modEnv2.attack");
    expect(
      container.querySelector(
        '[data-layout-control-id="envelope-loop"] [data-parameter-id="modEnv2.loop"]',
      ),
    ).not.toBeNull();
  });
});
