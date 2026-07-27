import { memo, useMemo } from "react";
import { catalogTarget, isFirmwareApplicable, parameterById } from "../domain/catalog";
import {
  getSetting,
  isDefinitionVisible,
  type ParameterValue,
  type PatchScope,
} from "../domain/patchUi";
import type { SummitPatchProposal } from "../domain/schemas";
import {
  IlluminatedButton,
  RotarySelector,
  SteppedSelector,
  SummitKnob,
  SummitSlider,
  SummitToggle,
  UnavailableControl,
  type ControlVisualState,
} from "./panel-controls/SummitControls";
import {
  summitPanelLayout,
  type LayoutControl,
} from "./SummitPanelLayout";

function controlStates(
  parameterId: string,
  value: ParameterValue,
  confidence: number,
  selectedParameterId: string | undefined,
  modified: boolean,
): ControlVisualState[] {
  const definition = parameterById.get(parameterId);
  const states: ControlVisualState[] = [];
  if (selectedParameterId === parameterId) states.push("selected");
  if (modified) states.push("modified");
  if (confidence < 1) states.push("suggested");
  if (confidence < 0.7) states.push("low-confidence");
  if (definition?.defaultValue === value) states.push("default");
  return states;
}

const ParameterControl = memo(function ParameterControl({
  control,
  parameterId,
  value,
  confidence,
  selectedParameterId,
  modified,
  highlighted,
  onSelect,
  onChange,
}: {
  control: LayoutControl;
  parameterId: string;
  value: ParameterValue;
  confidence: number;
  selectedParameterId: string | undefined;
  modified: boolean;
  highlighted: boolean;
  onSelect: (parameterId: string) => void;
  onChange: (parameterId: string, value: ParameterValue) => void;
}) {
  const states = controlStates(
    parameterId,
    value,
    confidence,
    selectedParameterId,
    modified,
  );
  const props = {
    parameterId,
    label: control.label,
    value,
    x: control.x,
    y: control.y,
    size: control.size,
    states,
    highlighted,
    onSelect,
    onChange,
  };
  switch (control.type) {
    case "slider":
      return <SummitSlider {...props} />;
    case "selector":
      return <SteppedSelector {...props} />;
    case "encoder":
      return <RotarySelector {...props} />;
    case "button":
      return <IlluminatedButton {...props} />;
    case "toggle":
    case "led":
      return <SummitToggle {...props} />;
    default:
      return <SummitKnob {...props} />;
  }
});

export const SummitPanel = memo(function SummitPanel({
  proposal,
  scope,
  selectedParameterId,
  changedIds = [],
  highlightedIds = [],
  focusedSectionId,
  onSelect,
  onChange,
}: {
  proposal: SummitPatchProposal;
  scope: PatchScope;
  selectedParameterId: string | undefined;
  changedIds?: string[];
  highlightedIds?: string[];
  focusedSectionId?: string | undefined;
  onSelect: (parameterId: string) => void;
  onChange: (parameterId: string, value: ParameterValue) => void;
}) {
  const changed = useMemo(() => new Set(changedIds), [changedIds]);
  const highlighted = useMemo(() => new Set(highlightedIds), [highlightedIds]);

  return (
    <svg
      className="summit-panel"
      viewBox={summitPanelLayout.viewBox}
      role="group"
      aria-label="Pannello vettoriale interattivo Novation Summit"
      data-scope={scope}
    >
      <defs>
        <linearGradient id="panel-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2b3034" />
          <stop offset=".42" stopColor="#1c2023" />
          <stop offset="1" stopColor="#101214" />
        </linearGradient>
        <linearGradient id="panel-edge" x1="0" x2="1">
          <stop offset="0" stopColor="#8d959a" stopOpacity=".22" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity=".04" />
          <stop offset="1" stopColor="#646b70" stopOpacity=".18" />
        </linearGradient>
        <filter id="control-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="8" y="8" width="8784" height="544" rx="22" fill="url(#panel-bg)" stroke="url(#panel-edge)" strokeWidth="4" />
      <path d="M 30 44 H 8768" className="panel-top-rule" />
      <text x="42" y="35" className="panel-wordmark">SUMMIT</text>
      <text x="8754" y="35" textAnchor="end" className="panel-submark">
        PATCH ARCHITECT · FIRMWARE {catalogTarget.primaryFirmware}
      </text>
      {summitPanelLayout.sections.map((section) => (
        <g
          key={section.id}
          className={`panel-section-group${focusedSectionId === section.id ? " focused" : ""}`}
          data-section-id={section.id}
        >
          <rect
            x={section.x}
            y={section.y}
            width={section.width}
            height={section.height}
            rx="9"
            className="panel-section"
          />
          <text
            x={section.x + 12}
            y={section.y + 24}
            className="panel-section-label"
          >
            {section.label}
          </text>
        </g>
      ))}
      <g className="panel-display-cluster">
        <rect x="7712" y="103" width="204" height="98" rx="5" className="oled" />
        <text x="7728" y="128" className="oled-text">{proposal.patch.name}</text>
        <text x="7728" y="151" className="oled-small">{scope === "single" ? "SINGLE · PART A" : scope === "multi-a" ? "MULTI · PART A" : "MULTI · PART B"}</text>
        <text x="7728" y="177" className="oled-small">{proposal.patch.category.toUpperCase()} · FW {proposal.targetFirmware ?? catalogTarget.primaryFirmware}</text>
      </g>
      {summitPanelLayout.controls.map((control) => {
        const candidateIds = [
          control.parameterId,
          ...(control.parameterIds ?? []),
        ].filter((candidate): candidate is string => Boolean(candidate));
        const parameterId = candidateIds.find((candidate) => {
          const definition = parameterById.get(candidate);
          return definition && isDefinitionVisible(definition, scope);
        });
        if (!parameterId || control.stateOnly) {
          return (
            <UnavailableControl
              key={control.id}
              label={control.label}
              type={control.type}
              x={control.x}
              y={control.y}
              size={control.size}
              reason="Controllo di stato hardware: il catalogo non pubblica un parametro patch associabile."
            />
          );
        }
        const definition = parameterById.get(parameterId);
        if (
          !definition ||
          !isFirmwareApplicable(
            definition,
            proposal.targetFirmware ?? catalogTarget.primaryFirmware,
          ) ||
          definition.verificationStatus !== "verified"
        ) {
          return (
            <UnavailableControl
              key={control.id}
              label={control.label}
              type={control.type}
              x={control.x}
              y={control.y}
              size={control.size}
              reason={definition?.verificationNote ?? "Parametro non verificato per il firmware selezionato."}
            />
          );
        }
        const setting = getSetting(proposal, parameterId, scope);
        if (!setting || definition.scope === "global") {
          return (
            <UnavailableControl
              key={control.id}
              label={control.label}
              type={control.type}
              x={control.x}
              y={control.y}
              size={control.size}
              reason={
                definition.scope === "global"
                  ? "Impostazione globale dello strumento: non viene salvata nella patch."
                  : "Il catalogo non documenta un default sicuro per questo controllo."
              }
            />
          );
        }
        return (
          <ParameterControl
            key={`${control.id}:${parameterId}`}
            control={control}
            parameterId={parameterId}
            value={setting.value}
            confidence={setting.confidence}
            selectedParameterId={selectedParameterId}
            modified={changed.has(parameterId)}
            highlighted={highlighted.has(parameterId)}
            onSelect={onSelect}
            onChange={onChange}
          />
        );
      })}
    </svg>
  );
});
