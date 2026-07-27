import { describe, expect, it } from "vitest";
import { parameterById, validateUiParameterValue } from "../../domain/catalog";
import {
  isBipolarDefinition,
  normalizeControlValue,
  stepControlValue,
  valueFromNormalized,
} from "./controlMath";

describe("Summit control math", () => {
  it("maps an integer knob through its catalog range", () => {
    const definition = parameterById.get("filter.frequency")!;
    expect(normalizeControlValue(definition, 0)).toBe(0);
    expect(normalizeControlValue(definition, 255)).toBe(1);
    expect(valueFromNormalized(definition, 0.5)).toBe(128);
    expect(stepControlValue(definition, 255, 1)).toBe(255);
  });

  it("keeps bipolar zero near the center and steps in both directions", () => {
    const definition = parameterById.get("filter.modEnv1Depth")!;
    expect(isBipolarDefinition(definition)).toBe(true);
    expect(normalizeControlValue(definition, 0)).toBeCloseTo(0.5, 2);
    expect(stepControlValue(definition, 0, -1)).toBe(-1);
    expect(stepControlValue(definition, 0, 1)).toBe(1);
  });

  it("uses enum order directly from the catalog", () => {
    const definition = parameterById.get("osc1.wave")!;
    expect(valueFromNormalized(definition, 0)).toBe("Sine");
    expect(valueFromNormalized(definition, 1)).toBe("more");
    expect(stepControlValue(definition, "Triangle", 1)).toBe("Sawtooth");
  });

  it("rejects invalid UI values without inventing coercions", () => {
    expect(validateUiParameterValue("filter.frequency", 256)).toMatch(/massimo 255/);
    expect(validateUiParameterValue("osc1.wave", "Noise")).toMatch(/enumerazione/);
    expect(validateUiParameterValue("unknown.parameter", 0)).toMatch(/non presente/);
  });
});
