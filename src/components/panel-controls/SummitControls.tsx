import {
  memo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { parameterById } from "../../domain/catalog";
import {
  formatParameterValue,
  isParameterValue,
  type ParameterValue,
} from "../../domain/patchUi";
import type { SummitParameterDefinition } from "../../domain/schemas";
import {
  isBipolarDefinition,
  normalizeControlValue,
  stepControlValue,
  valueFromNormalized,
} from "./controlMath";

export type ControlVisualState =
  | "default"
  | "modified"
  | "suggested"
  | "selected"
  | "low-confidence"
  | "unavailable";

type CommonProps = {
  parameterId: string;
  label: string;
  value: ParameterValue;
  x: number;
  y: number;
  size?: number | undefined;
  states: readonly ControlVisualState[];
  highlighted?: boolean;
  onSelect: (parameterId: string) => void;
  onChange: (parameterId: string, value: ParameterValue) => void;
};

type Interaction = {
  displayValue: ParameterValue;
  normalized: number;
  handlers: {
    onPointerDown: (event: PointerEvent<SVGGElement>) => void;
    onPointerMove: (event: PointerEvent<SVGGElement>) => void;
    onPointerUp: (event: PointerEvent<SVGGElement>) => void;
    onPointerCancel: (event: PointerEvent<SVGGElement>) => void;
    onWheel: (event: WheelEvent<SVGGElement>) => void;
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
    onDoubleClick: () => void;
    onFocus: () => void;
  };
};

function useControlInteraction(
  props: CommonProps,
  definition: SummitParameterDefinition,
): Interaction {
  const [localValue, setLocalValue] = useState<ParameterValue | undefined>(
    undefined,
  );
  const displayValue = localValue ?? props.value;
  const drag = useRef<
    { pointerId: number; y: number; normalized: number } | undefined
  >(undefined);

  const commit = (next: ParameterValue) => {
    setLocalValue(undefined);
    props.onChange(props.parameterId, next);
  };

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    props.onSelect(props.parameterId);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      normalized: normalizeControlValue(definition, displayValue),
    };
  };
  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const normalized = drag.current.normalized + (drag.current.y - event.clientY) / 150;
    setLocalValue(valueFromNormalized(definition, normalized));
  };
  const finishPointer = (event: PointerEvent<SVGGElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commit(localValue ?? props.value);
  };
  const onWheel = (event: WheelEvent<SVGGElement>) => {
    event.preventDefault();
    props.onSelect(props.parameterId);
    commit(stepControlValue(definition, displayValue, event.deltaY < 0 ? 1 : -1));
  };
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const direction =
      event.key === "ArrowUp" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowDown" || event.key === "ArrowLeft"
          ? -1
          : undefined;
    if (direction !== undefined) {
      event.preventDefault();
      commit(
        stepControlValue(
          definition,
          displayValue,
          direction,
          event.shiftKey || event.key === "PageUp" || event.key === "PageDown" ? 10 : 1,
        ),
      );
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      commit(valueFromNormalized(definition, 0));
    } else if (event.key === "End") {
      event.preventDefault();
      commit(valueFromNormalized(definition, 1));
    } else if (event.key === "Escape" || event.key === "Backspace") {
      if (isParameterValue(definition.defaultValue)) {
        event.preventDefault();
        commit(definition.defaultValue);
      }
    }
  };
  const onDoubleClick = () => {
    if (isParameterValue(definition.defaultValue)) {
      commit(definition.defaultValue);
    }
  };
  return {
    displayValue,
    normalized: normalizeControlValue(definition, displayValue),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onWheel,
      onKeyDown,
      onDoubleClick,
      onFocus: () => props.onSelect(props.parameterId),
    },
  };
}

function controlClass(
  base: string,
  states: readonly ControlVisualState[],
  highlighted = false,
) {
  return ["panel-control", base, ...states, highlighted ? "setup-highlight" : ""]
    .filter(Boolean)
    .join(" ");
}

function StatusMarkers({
  x,
  y,
  states,
}: {
  x: number;
  y: number;
  states: readonly ControlVisualState[];
}) {
  return (
    <g className="control-status-markers" aria-hidden="true">
      {states.includes("modified") ? (
        <path d={`M ${x - 5} ${y} L ${x} ${y - 5} L ${x + 5} ${y} L ${x} ${y + 5} Z`} className="marker-modified" />
      ) : null}
      {states.includes("suggested") ? <text x={x} y={y + 3} className="marker-suggested">✦</text> : null}
      {states.includes("low-confidence") ? <text x={x} y={y + 3} className="marker-low">?</text> : null}
    </g>
  );
}

function ariaValues(definition: SummitParameterDefinition, value: ParameterValue) {
  const numericValue = definition.enumValues
    ? definition.enumValues.indexOf(String(value))
    : definition.valueType === "boolean"
      ? value === true
        ? 1
        : 0
      : typeof value === "number"
        ? value
        : 0;
  return {
    "aria-valuemin": definition.enumValues ? 0 : definition.minimum,
    "aria-valuemax": definition.enumValues
      ? definition.enumValues.length - 1
      : definition.maximum,
    "aria-valuenow": numericValue,
    "aria-valuetext": formatParameterValue(definition, value),
  };
}

function useDefinition(parameterId: string) {
  const definition = parameterById.get(parameterId);
  if (!definition) throw new Error(`Controllo legato a parametro inesistente: ${parameterId}`);
  return definition;
}

export const SummitKnob = memo(function SummitKnob(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const radius = (props.size ?? 72) / 2;
  const rotation = -135 + interaction.normalized * 270;
  const formatted = formatParameterValue(definition, interaction.displayValue);
  const bipolar = isBipolarDefinition(definition);
  return (
    <g
      className={controlClass("summit-knob", props.states, props.highlighted)}
      role="slider"
      tabIndex={0}
      aria-label={`${props.label}: ${formatted}`}
      data-parameter-id={props.parameterId}
      {...ariaValues(definition, interaction.displayValue)}
      {...interaction.handlers}
    >
      <title>{`${definition.label} · ${formatted} · trascina verticalmente, usa trackpad o frecce; doppio clic per il default`}</title>
      <text x={props.x} y={props.y - radius - 20} textAnchor="middle" className="control-label">{props.label}</text>
      <path d={`M ${props.x - radius * 0.72} ${props.y + radius * 0.72} A ${radius} ${radius} 0 1 1 ${props.x + radius * 0.72} ${props.y + radius * 0.72}`} className="knob-arc" />
      {bipolar ? <line x1={props.x} y1={props.y - radius - 5} x2={props.x} y2={props.y - radius + 4} className="bipolar-zero" /> : null}
      <circle cx={props.x} cy={props.y} r={radius + 10} className="control-halo" />
      <circle cx={props.x} cy={props.y} r={radius} className="knob-rim" />
      <circle cx={props.x} cy={props.y} r={radius - 7} className="knob-body" />
      <line x1={props.x} y1={props.y} x2={props.x} y2={props.y - radius + 12} className="knob-indicator" transform={`rotate(${rotation} ${props.x} ${props.y})`} />
      <text x={props.x} y={props.y + radius + 31} textAnchor="middle" className="control-value">{formatted}</text>
      <StatusMarkers x={props.x + radius + 8} y={props.y - radius - 3} states={props.states} />
    </g>
  );
});

export const SummitSlider = memo(function SummitSlider(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const formatted = formatParameterValue(definition, interaction.displayValue);
  const top = props.y - 80;
  const bottom = props.y + 80;
  const handleY = bottom - interaction.normalized * (bottom - top);
  return (
    <g
      className={controlClass("summit-slider", props.states, props.highlighted)}
      role="slider"
      tabIndex={0}
      aria-label={`${props.label}: ${formatted}`}
      aria-orientation="vertical"
      data-parameter-id={props.parameterId}
      {...ariaValues(definition, interaction.displayValue)}
      {...interaction.handlers}
    >
      <title>{`${definition.label} · ${formatted} · trascina verticalmente, usa trackpad o frecce; doppio clic per il default`}</title>
      <text x={props.x} y={top - 28} textAnchor="middle" className="control-label">{props.label}</text>
      <rect x={props.x - 12} y={top - 8} width="24" height={bottom - top + 16} rx="8" className="slider-well" />
      <line x1={props.x} y1={top} x2={props.x} y2={bottom} className="slider-track" />
      {isBipolarDefinition(definition) ? <line x1={props.x - 16} y1={props.y} x2={props.x + 16} y2={props.y} className="bipolar-zero" /> : null}
      <rect x={props.x - 21} y={handleY - 8} width="42" height="16" rx="4" className="slider-handle" />
      <line x1={props.x - 14} y1={handleY} x2={props.x + 14} y2={handleY} className="slider-handle-line" />
      <text x={props.x} y={bottom + 31} textAnchor="middle" className="control-value">{formatted}</text>
      <StatusMarkers x={props.x + 21} y={top - 20} states={props.states} />
    </g>
  );
});

export const SteppedSelector = memo(function SteppedSelector(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const radius = (props.size ?? 66) / 2;
  const formatted = formatParameterValue(definition, interaction.displayValue);
  const positions = Math.min(7, Math.max(2, definition.enumValues?.length ?? 3));
  return (
    <g
      className={controlClass("stepped-selector", props.states, props.highlighted)}
      role="slider"
      tabIndex={0}
      aria-label={`${props.label}: ${formatted}`}
      data-parameter-id={props.parameterId}
      {...ariaValues(definition, interaction.displayValue)}
      {...interaction.handlers}
    >
      <title>{`${definition.label} · ${formatted} · selettore a scatti`}</title>
      <text x={props.x} y={props.y - radius - 20} textAnchor="middle" className="control-label">{props.label}</text>
      {Array.from({ length: positions }, (_, index) => {
        const angle = (-135 + (270 * index) / (positions - 1)) * (Math.PI / 180);
        return <circle key={index} cx={props.x + Math.sin(angle) * (radius + 9)} cy={props.y - Math.cos(angle) * (radius + 9)} r="2.4" className="selector-tick" />;
      })}
      <circle cx={props.x} cy={props.y} r={radius + 10} className="control-halo" />
      <circle cx={props.x} cy={props.y} r={radius} className="selector-body" />
      <line x1={props.x} y1={props.y} x2={props.x} y2={props.y - radius + 10} className="knob-indicator" transform={`rotate(${-135 + interaction.normalized * 270} ${props.x} ${props.y})`} />
      <text x={props.x} y={props.y + radius + 31} textAnchor="middle" className="control-value">{formatted}</text>
      <StatusMarkers x={props.x + radius + 8} y={props.y - radius - 3} states={props.states} />
    </g>
  );
});

export const RotarySelector = memo(function RotarySelector(props: CommonProps) {
  return <SteppedSelector {...props} states={[...props.states]} />;
});

export const IlluminatedButton = memo(function IlluminatedButton(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const formatted = formatParameterValue(definition, interaction.displayValue);
  const activate = () => {
    props.onSelect(props.parameterId);
    const next = stepControlValue(definition, interaction.displayValue, 1);
    props.onChange(
      props.parameterId,
      next === interaction.displayValue
        ? valueFromNormalized(definition, 0)
        : next,
    );
  };
  return (
    <g
      className={controlClass("illuminated-button", props.states, props.highlighted)}
      role="button"
      tabIndex={0}
      aria-label={`${props.label}: ${formatted}`}
      aria-pressed={interaction.normalized > 0}
      data-parameter-id={props.parameterId}
      onClick={activate}
      onFocus={() => props.onSelect(props.parameterId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
      onDoubleClick={interaction.handlers.onDoubleClick}
    >
      <title>{`${definition.label} · ${formatted}`}</title>
      <text x={props.x} y={props.y - 27} textAnchor="middle" className="control-label">{props.label}</text>
      <rect x={props.x - 31} y={props.y - 15} width="62" height="30" rx="6" className="button-bezel" />
      <rect x={props.x - 24} y={props.y - 9} width="48" height="18" rx="4" className="button-cap" />
      <circle cx={props.x + 23} cy={props.y - 9} r="4" className="control-led" />
      <text x={props.x} y={props.y + 34} textAnchor="middle" className="control-value">{formatted}</text>
      <StatusMarkers x={props.x + 34} y={props.y - 21} states={props.states} />
    </g>
  );
});

export const SummitToggle = memo(function SummitToggle(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const formatted = formatParameterValue(definition, interaction.displayValue);
  const activate = () => {
    props.onSelect(props.parameterId);
    props.onChange(
      props.parameterId,
      interaction.normalized >= 0.5
        ? valueFromNormalized(definition, 0)
        : valueFromNormalized(definition, 1),
    );
  };
  return (
    <g
      className={controlClass("summit-toggle", props.states, props.highlighted)}
      role="switch"
      tabIndex={0}
      aria-label={`${props.label}: ${formatted}`}
      aria-checked={interaction.normalized >= 0.5}
      data-parameter-id={props.parameterId}
      onClick={activate}
      onFocus={() => props.onSelect(props.parameterId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
      onDoubleClick={interaction.handlers.onDoubleClick}
    >
      <title>{`${definition.label} · ${formatted}`}</title>
      <text x={props.x} y={props.y - 31} textAnchor="middle" className="control-label">{props.label}</text>
      <rect x={props.x - 28} y={props.y - 14} width="56" height="28" rx="14" className="toggle-track" />
      <circle cx={props.x + (interaction.normalized >= 0.5 ? 14 : -14)} cy={props.y} r="10" className="toggle-thumb" />
      <text x={props.x} y={props.y + 35} textAnchor="middle" className="control-value">{formatted}</text>
      <StatusMarkers x={props.x + 31} y={props.y - 23} states={props.states} />
    </g>
  );
});

export const UnavailableControl = memo(function UnavailableControl({
  label,
  type,
  x,
  y,
  size = 66,
  reason,
}: {
  label: string;
  type: "knob" | "slider" | "selector" | "button" | "toggle" | "encoder" | "led";
  x: number;
  y: number;
  size?: number | undefined;
  reason: string;
}) {
  const radius = size / 2;
  return (
    <g className={`panel-control unavailable unavailable-${type}`} aria-label={`${label}: non disponibile`} role="img">
      <title>{`${label} · ${reason}`}</title>
      <text x={x} y={y - radius - 20} textAnchor="middle" className="control-label">{label}</text>
      {type === "slider" ? (
        <>
          <line x1={x} y1={y - 80} x2={x} y2={y + 80} className="slider-track" />
          <rect x={x - 20} y={y - 7} width="40" height="14" rx="4" className="slider-handle" />
        </>
      ) : type === "button" || type === "toggle" ? (
        <rect x={x - 29} y={y - 15} width="58" height="30" rx="6" className="button-bezel" />
      ) : (
        <circle cx={x} cy={y} r={radius} className="knob-body" />
      )}
      <line x1={x - 13} y1={y - 13} x2={x + 13} y2={y + 13} className="unavailable-cross" />
      <line x1={x + 13} y1={y - 13} x2={x - 13} y2={y + 13} className="unavailable-cross" />
      <text x={x} y={y + radius + 31} textAnchor="middle" className="control-value">N/D</text>
    </g>
  );
});
