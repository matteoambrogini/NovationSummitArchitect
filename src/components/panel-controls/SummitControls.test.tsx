import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummitKnob, SummitSlider, SummitValueEncoder } from "./SummitControls";

const common = {
  x: 50,
  y: 80,
  states: [] as const,
  onSelect: vi.fn(),
};

describe("reusable Summit controls", () => {
  it("binds a knob to the catalog and supports keyboard plus reset", () => {
    const onChange = vi.fn();
    render(
      <svg>
        <SummitKnob
          {...common}
          parameterId="filter.frequency"
          label="Frequency"
          value={185}
          onChange={onChange}
        />
      </svg>,
    );
    const knob = screen.getByRole("slider", { name: "Frequency: 185" });
    expect(knob).toHaveAttribute("data-parameter-id", "filter.frequency");
    expect(knob).toHaveAttribute("aria-valuemax", "255");
    fireEvent.keyDown(knob, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("filter.frequency", 186);
    fireEvent.doubleClick(knob);
    expect(onChange).toHaveBeenLastCalledWith("filter.frequency", 255);
  });

  it("supports a vertical slider with bipolar metadata", () => {
    const onChange = vi.fn();
    render(
      <svg>
        <SummitSlider
          {...common}
          parameterId="filter.modEnv1Depth"
          label="Depth"
          value={0}
          onChange={onChange}
        />
      </svg>,
    );
    const slider = screen.getByRole("slider", { name: "Depth: 0" });
    expect(slider).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.keyDown(slider, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("filter.modEnv1Depth", -1);
  });

  it("supports Value encoder keyboard, wheel and vertical drag steps", () => {
    const onStep = vi.fn();
    render(
      <svg>
        <SummitValueEncoder
          id="menu-value"
          label="Value"
          valueText="7"
          x={50}
          y={50}
          onSelect={vi.fn()}
          onStep={onStep}
        />
      </svg>,
    );
    const encoder = screen.getByRole("slider", { name: "Value: 7" });
    fireEvent.keyDown(encoder, { key: "ArrowUp" });
    fireEvent.wheel(encoder, { deltaY: 10 });
    expect(onStep).toHaveBeenNthCalledWith(1, 1);
    expect(onStep).toHaveBeenNthCalledWith(2, -1);

    Object.assign(encoder, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => false),
    });
    fireEvent.pointerDown(encoder, { pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 84 });
    fireEvent.pointerUp(encoder, { pointerId: 1, clientY: 84 });
    expect(onStep).toHaveBeenCalledWith(2);
  });
});
