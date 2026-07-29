import type { SummitParameterDefinition } from "../../domain/schemas";
import type { ParameterValue } from "../../domain/patchUi";

export function normalizeControlValue(
  definition: SummitParameterDefinition,
  value: ParameterValue,
): number {
  if (definition.valueType === "boolean") return value === true ? 1 : 0;
  if (definition.enumValues) {
    const index = definition.enumValues.indexOf(String(value));
    return Math.max(0, index) / Math.max(1, definition.enumValues.length - 1);
  }
  if (
    typeof value === "number" &&
    definition.minimum !== undefined &&
    definition.maximum !== undefined
  ) {
    return Math.max(
      0,
      Math.min(1, (value - definition.minimum) / (definition.maximum - definition.minimum)),
    );
  }
  return 0;
}

export function valueFromNormalized(
  definition: SummitParameterDefinition,
  normalized: number,
): ParameterValue {
  const clamped = Math.max(0, Math.min(1, normalized));
  if (definition.valueType === "boolean") return clamped >= 0.5;
  if (definition.enumValues) {
    return definition.enumValues[
      Math.round(clamped * Math.max(0, definition.enumValues.length - 1))
    ]!;
  }
  const minimum = definition.minimum ?? 0;
  const maximum = definition.maximum ?? minimum;
  const step = definition.step ?? 1;
  const stepped = minimum + Math.round(((maximum - minimum) * clamped) / step) * step;
  return Math.max(minimum, Math.min(maximum, Number(stepped.toFixed(8))));
}

export function stepControlValue(
  definition: SummitParameterDefinition,
  value: ParameterValue,
  direction: -1 | 1,
  multiplier = 1,
): ParameterValue {
  if (definition.valueType === "boolean") return direction > 0;
  if (definition.enumValues) {
    const currentIndex = Math.max(0, definition.enumValues.indexOf(String(value)));
    const index = Math.max(
      0,
      Math.min(
        definition.enumValues.length - 1,
        currentIndex + direction * multiplier,
      ),
    );
    return definition.enumValues[index]!;
  }
  if (typeof value !== "number") return value;
  const minimum = definition.minimum ?? value;
  const maximum = definition.maximum ?? value;
  const step = (definition.step ?? 1) * multiplier;
  return Math.max(minimum, Math.min(maximum, Number((value + direction * step).toFixed(8))));
}

export function isBipolarDefinition(definition: SummitParameterDefinition): boolean {
  return (
    definition.valueType === "bipolar" ||
    (definition.minimum !== undefined &&
      definition.maximum !== undefined &&
      definition.minimum < 0 &&
      definition.maximum > 0)
  );
}
