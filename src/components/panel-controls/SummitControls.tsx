import {
  memo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { parameterById } from "../../domain/catalog";
import { formatParameterValue, isParameterValue, type ParameterValue } from "../../domain/patchUi";
import type { SummitParameterDefinition } from "../../domain/schemas";
import {
  isBipolarDefinition,
  normalizeControlValue,
  stepControlValue,
  valueFromNormalized,
} from "./controlMath";

export type ControlVisualState =
  "default" | "modified" | "suggested" | "selected" | "low-confidence" | "unavailable";

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
  const [localValue, setLocalValue] = useState<ParameterValue | undefined>(undefined);
  const displayValue = localValue ?? props.value;
  const drag = useRef<{ pointerId: number; y: number; normalized: number } | undefined>(undefined);

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

function controlClass(base: string, states: readonly ControlVisualState[], highlighted = false) {
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
        <path
          d={`M ${x - 5} ${y} L ${x} ${y - 5} L ${x + 5} ${y} L ${x} ${y + 5} Z`}
          className="marker-modified"
        />
      ) : null}
      {states.includes("suggested") ? (
        <text x={x} y={y + 3} className="marker-suggested">
          ✦
        </text>
      ) : null}
      {states.includes("low-confidence") ? (
        <text x={x} y={y + 3} className="marker-low">
          ?
        </text>
      ) : null}
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
    "aria-valuemax": definition.enumValues ? definition.enumValues.length - 1 : definition.maximum,
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
  const radius = (props.size ?? 20) / 2;
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
      <text x={props.x} y={props.y - radius - 6} textAnchor="middle" className="control-label">
        {props.label}
      </text>
      <path
        d={`M ${props.x - radius * 0.72} ${props.y + radius * 0.72} A ${radius} ${radius} 0 1 1 ${props.x + radius * 0.72} ${props.y + radius * 0.72}`}
        className="knob-arc"
      />
      {bipolar ? (
        <line
          x1={props.x}
          y1={props.y - radius - 5}
          x2={props.x}
          y2={props.y - radius + 4}
          className="bipolar-zero"
        />
      ) : null}
      <circle cx={props.x} cy={props.y} r={radius + 4} className="control-halo" />
      <circle cx={props.x} cy={props.y} r={radius} className="knob-rim" />
      <circle cx={props.x} cy={props.y} r={Math.max(3, radius - 2.5)} className="knob-body" />
      <line
        x1={props.x}
        y1={props.y}
        x2={props.x}
        y2={props.y - Math.max(3, radius - 3)}
        className="knob-indicator"
        transform={`rotate(${rotation} ${props.x} ${props.y})`}
      />
      <text x={props.x} y={props.y + radius + 11} textAnchor="middle" className="control-value">
        {formatted}
      </text>
      <StatusMarkers x={props.x + radius + 4} y={props.y - radius - 2} states={props.states} />
    </g>
  );
});

export const SummitSlider = memo(function SummitSlider(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const formatted = formatParameterValue(definition, interaction.displayValue);
  const travel = props.size ?? 52;
  const top = props.y - travel / 2;
  const bottom = props.y + travel / 2;
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
      <text x={props.x} y={top - 6} textAnchor="middle" className="control-label">
        {props.label}
      </text>
      <rect
        x={props.x - 4}
        y={top - 3}
        width="8"
        height={bottom - top + 6}
        rx="3"
        className="slider-well"
      />
      <line x1={props.x} y1={top} x2={props.x} y2={bottom} className="slider-track" />
      {isBipolarDefinition(definition) ? (
        <line
          x1={props.x - 6}
          y1={props.y}
          x2={props.x + 6}
          y2={props.y}
          className="bipolar-zero"
        />
      ) : null}
      <rect
        x={props.x - 7}
        y={handleY - 3}
        width="14"
        height="6"
        rx="2"
        className="slider-handle"
      />
      <line
        x1={props.x - 5}
        y1={handleY}
        x2={props.x + 5}
        y2={handleY}
        className="slider-handle-line"
      />
      <text x={props.x} y={bottom + 10} textAnchor="middle" className="control-value">
        {formatted}
      </text>
      <StatusMarkers x={props.x + 8} y={top - 4} states={props.states} />
    </g>
  );
});

export const SteppedSelector = memo(function SteppedSelector(props: CommonProps) {
  const definition = useDefinition(props.parameterId);
  const interaction = useControlInteraction(props, definition);
  const radius = (props.size ?? 19) / 2;
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
      <text x={props.x} y={props.y - radius - 6} textAnchor="middle" className="control-label">
        {props.label}
      </text>
      {Array.from({ length: positions }, (_, index) => {
        const angle = (-135 + (270 * index) / (positions - 1)) * (Math.PI / 180);
        return (
          <circle
            key={index}
            cx={props.x + Math.sin(angle) * (radius + 3)}
            cy={props.y - Math.cos(angle) * (radius + 3)}
            r="1"
            className="selector-tick"
          />
        );
      })}
      <circle cx={props.x} cy={props.y} r={radius + 4} className="control-halo" />
      <circle cx={props.x} cy={props.y} r={radius} className="selector-body" />
      <line
        x1={props.x}
        y1={props.y}
        x2={props.x}
        y2={props.y - Math.max(3, radius - 3)}
        className="knob-indicator"
        transform={`rotate(${-135 + interaction.normalized * 270} ${props.x} ${props.y})`}
      />
      <text x={props.x} y={props.y + radius + 11} textAnchor="middle" className="control-value">
        {formatted}
      </text>
      <StatusMarkers x={props.x + radius + 4} y={props.y - radius - 2} states={props.states} />
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
  const width = Math.max(14, (props.size ?? 18) * 1.55);
  const height = Math.max(8, (props.size ?? 18) * 0.72);
  const activate = () => {
    props.onSelect(props.parameterId);
    const next = stepControlValue(definition, interaction.displayValue, 1);
    props.onChange(
      props.parameterId,
      next === interaction.displayValue ? valueFromNormalized(definition, 0) : next,
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
      <text x={props.x} y={props.y - height / 2 - 5} textAnchor="middle" className="control-label">
        {props.label}
      </text>
      <rect
        x={props.x - width / 2}
        y={props.y - height / 2}
        width={width}
        height={height}
        rx="2.5"
        className="button-bezel"
      />
      <rect
        x={props.x - width / 2 + 2}
        y={props.y - height / 2 + 2}
        width={width - 4}
        height={height - 4}
        rx="1.5"
        className="button-cap"
      />
      <circle
        cx={props.x + width / 2 - 2}
        cy={props.y - height / 2 + 2}
        r="1.5"
        className="control-led"
      />
      <text x={props.x} y={props.y + height / 2 + 10} textAnchor="middle" className="control-value">
        {formatted}
      </text>
      <StatusMarkers x={props.x + width / 2 + 3} y={props.y - height / 2} states={props.states} />
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
      <text x={props.x} y={props.y - 12} textAnchor="middle" className="control-label">
        {props.label}
      </text>
      <rect
        x={props.x - 11}
        y={props.y - 5}
        width="22"
        height="10"
        rx="5"
        className="toggle-track"
      />
      <circle
        cx={props.x + (interaction.normalized >= 0.5 ? 5 : -5)}
        cy={props.y}
        r="3.5"
        className="toggle-thumb"
      />
      <text x={props.x} y={props.y + 14} textAnchor="middle" className="control-value">
        {formatted}
      </text>
      <StatusMarkers x={props.x + 13} y={props.y - 8} states={props.states} />
    </g>
  );
});

export const UnavailableControl = memo(function UnavailableControl({
  label,
  type,
  x,
  y,
  size = 18,
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
    <g
      className={`panel-control unavailable unavailable-${type}`}
      aria-label={`${label}: non disponibile`}
      role="img"
    >
      <title>{`${label} · ${reason}`}</title>
      <text x={x} y={y - radius - 5} textAnchor="middle" className="control-label">
        {label}
      </text>
      {type === "slider" ? (
        <>
          <line x1={x} y1={y - size / 2} x2={x} y2={y + size / 2} className="slider-track" />
          <rect x={x - 6} y={y - 2.5} width="12" height="5" rx="2" className="slider-handle" />
        </>
      ) : type === "button" || type === "toggle" ? (
        <rect
          x={x - size * 0.72}
          y={y - size * 0.35}
          width={size * 1.44}
          height={size * 0.7}
          rx="2"
          className="button-bezel"
        />
      ) : (
        <circle cx={x} cy={y} r={radius} className="knob-body" />
      )}
      <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} className="unavailable-cross" />
      <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} className="unavailable-cross" />
      <text x={x} y={y + radius + 10} textAnchor="middle" className="control-value">
        N/D
      </text>
    </g>
  );
});

type HardwareElementProps = {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number | undefined;
  highlighted?: boolean;
  displayAreaId?: string | undefined;
  active?: boolean;
  disabled?: boolean;
  onClick?: (() => void) | undefined;
};

export const SummitButton = memo(function SummitButton({
  id,
  label,
  x,
  y,
  size = 16,
  highlighted = false,
  displayAreaId,
  active = false,
  disabled = false,
  onClick,
}: HardwareElementProps) {
  const width = Math.max(13, size * 1.55);
  const height = Math.max(7, size * 0.68);
  const interactive = Boolean(onClick);
  const activate = () => {
    if (!disabled) onClick?.();
  };
  return (
    <g
      className={[
        "hardware-control",
        "summit-button",
        highlighted ? "setup-highlight" : "",
        active ? "active" : "",
        disabled ? "disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={interactive ? "button" : "img"}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-label={
        interactive ? `${label}: controllo menu hardware` : `${label}: controllo hardware`
      }
      aria-pressed={interactive ? active : undefined}
      aria-disabled={interactive ? disabled : undefined}
      data-control-id={id}
      data-display-area-id={displayAreaId}
      onClick={activate}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
    >
      <title>{`${label} · controllo hardware o di navigazione, non salvato nella patch`}</title>
      <text x={x} y={y - height / 2 - 4} textAnchor="middle" className="control-label">
        {label}
      </text>
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx="2"
        className="button-bezel"
      />
      <rect
        x={x - width / 2 + 2}
        y={y - height / 2 + 2}
        width={width - 4}
        height={height - 4}
        rx="1"
        className="button-cap"
      />
      <circle cx={x + width / 2 - 2} cy={y - height / 2 + 2} r="1.3" className="control-led" />
    </g>
  );
});

export const SummitValueEncoder = memo(function SummitValueEncoder({
  id,
  label,
  valueText,
  x,
  y,
  size = 18,
  active = false,
  disabled = false,
  onSelect,
  onStep,
}: {
  id: string;
  label: string;
  valueText: string;
  x: number;
  y: number;
  size?: number | undefined;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onStep: (steps: number) => void;
}) {
  const drag = useRef<{ pointerId: number; y: number; steps: number } | undefined>(undefined);
  const radius = size / 2;
  const step = (steps: number) => {
    if (!disabled && steps !== 0) onStep(steps);
  };
  return (
    <g
      className={[
        "panel-control",
        "summit-value-encoder",
        active ? "selected" : "",
        disabled ? "disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="slider"
      tabIndex={disabled ? undefined : 0}
      aria-label={`${label}: ${valueText}`}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      data-control-id={id}
      onFocus={onSelect}
      onPointerDown={(event) => {
        if (disabled) return;
        onSelect();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, y: event.clientY, steps: 0 };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const nextSteps = Math.trunc((current.y - event.clientY) / 8);
        const delta = nextSteps - current.steps;
        if (delta !== 0) {
          current.steps = nextSteps;
          step(delta);
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        drag.current = undefined;
      }}
      onPointerCancel={() => {
        drag.current = undefined;
      }}
      onWheel={(event) => {
        event.preventDefault();
        onSelect();
        step(event.deltaY < 0 ? 1 : -1);
      }}
      onKeyDown={(event) => {
        const direction =
          event.key === "ArrowUp" || event.key === "ArrowRight"
            ? 1
            : event.key === "ArrowDown" || event.key === "ArrowLeft"
              ? -1
              : 0;
        if (direction !== 0) {
          event.preventDefault();
          step(direction * (event.shiftKey ? 10 : 1));
        }
      }}
    >
      <title>{`${label} · ${valueText} · trascina verticalmente, usa trackpad o frecce`}</title>
      <text x={x} y={y - radius - 5} textAnchor="middle" className="control-label">
        {label}
      </text>
      <path
        d={`M ${x - radius * 0.72} ${y + radius * 0.72} A ${radius} ${radius} 0 1 1 ${x + radius * 0.72} ${y + radius * 0.72}`}
        className="knob-arc"
      />
      <circle cx={x} cy={y} r={radius + 3} className="control-halo" />
      <circle cx={x} cy={y} r={radius} className="knob-rim" />
      <circle cx={x} cy={y} r={Math.max(3, radius - 2.5)} className="knob-body" />
      <line x1={x} y1={y} x2={x} y2={y - Math.max(3, radius - 3)} className="knob-indicator" />
      <text x={x} y={y + radius + 10} textAnchor="middle" className="control-value">
        {valueText}
      </text>
    </g>
  );
});

export const SummitLed = memo(function SummitLed({
  id,
  label,
  x,
  y,
  highlighted = false,
}: HardwareElementProps) {
  return (
    <g
      className="hardware-control summit-led"
      role="img"
      aria-label={`${label}: LED`}
      data-control-id={id}
    >
      <title>{label}</title>
      <circle
        cx={x}
        cy={y}
        r="2.3"
        className={highlighted ? "control-led active" : "control-led"}
      />
    </g>
  );
});

function SummitWheel({
  id,
  label,
  x,
  y,
  size = 56,
  className,
}: HardwareElementProps & { className: string }) {
  return (
    <g
      className={`hardware-control summit-wheel ${className}`}
      role="img"
      aria-label={label}
      data-control-id={id}
    >
      <title>{`${label} · performance control`}</title>
      <rect
        x={x - size * 0.23}
        y={y - size / 2}
        width={size * 0.46}
        height={size}
        rx={size * 0.18}
        className="wheel-well"
      />
      <rect
        x={x - size * 0.15}
        y={y - size * 0.4}
        width={size * 0.3}
        height={size * 0.8}
        rx={size * 0.12}
        className="wheel-body"
      />
      {Array.from({ length: 7 }, (_, index) => (
        <line
          key={index}
          x1={x - size * 0.1}
          x2={x + size * 0.1}
          y1={y - size * 0.25 + index * size * 0.083}
          y2={y - size * 0.25 + index * size * 0.083}
          className="wheel-ridge"
        />
      ))}
    </g>
  );
}

export const SummitPitchWheel = memo(function SummitPitchWheel(props: HardwareElementProps) {
  return <SummitWheel {...props} className="pitch-wheel" />;
});

export const SummitModWheel = memo(function SummitModWheel(props: HardwareElementProps) {
  return <SummitWheel {...props} className="mod-wheel" />;
});

export const SummitIlluminatedButton = IlluminatedButton;
export const SummitRotarySelector = RotarySelector;
