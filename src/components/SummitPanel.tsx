import { memo, useMemo } from "react";
import { catalogTarget, isFirmwareApplicable, parameterById } from "../domain/catalog";
import { getDisplaySelection } from "../domain/displayStructure";
import {
  getSetting,
  isDefinitionVisible,
  type ParameterValue,
  type PatchScope,
} from "../domain/patchUi";
import type { SummitPatchProposal } from "../domain/schemas";
import { SummitOledSvg } from "./SummitDisplay";
import {
  IlluminatedButton,
  RotarySelector,
  SteppedSelector,
  SummitButton,
  SummitKnob,
  SummitModWheel,
  SummitPitchWheel,
  SummitSlider,
  SummitToggle,
  UnavailableControl,
  type ControlVisualState,
} from "./panel-controls/SummitControls";
import { summitPanelLayout, type LayoutControl } from "./SummitPanelLayout";

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
  const states = controlStates(parameterId, value, confidence, selectedParameterId, modified);
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

function StateOnlyControl({
  control,
  highlighted,
}: {
  control: LayoutControl;
  highlighted: boolean;
}) {
  if (control.type === "button" || control.type === "toggle") {
    return (
      <SummitButton
        id={control.id}
        label={control.label}
        x={control.x}
        y={control.y}
        size={control.size}
        highlighted={highlighted}
        displayAreaId={control.displayAreaId}
      />
    );
  }
  const radius = (control.size ?? 18) / 2;
  return (
    <g
      className={`hardware-control hardware-${control.type}${highlighted ? " setup-highlight" : ""}`}
      role="img"
      aria-label={`${control.label}: controllo hardware`}
      data-control-id={control.id}
      data-display-area-id={control.displayAreaId}
    >
      <title>{`${control.label} · controllo hardware, non salvato nella patch`}</title>
      <text x={control.x} y={control.y - radius - 5} textAnchor="middle" className="control-label">
        {control.label}
      </text>
      <circle cx={control.x} cy={control.y} r={radius + 2} className="knob-rim" />
      <circle cx={control.x} cy={control.y} r={Math.max(3, radius - 1.5)} className="knob-body" />
      <line
        x1={control.x}
        y1={control.y}
        x2={control.x}
        y2={control.y - Math.max(3, radius - 3)}
        className="knob-indicator"
      />
    </g>
  );
}

function SummitKeyboard() {
  const x = 185;
  const y = 288;
  const width = 1274;
  const whiteCount = 36;
  const whiteWidth = width / whiteCount;
  const blackAfter = new Set<number>();
  for (let octave = 0; octave < 5; octave += 1) {
    const base = octave * 7;
    [0, 1, 3, 4, 5].forEach((offset) => blackAfter.add(base + offset));
  }
  return (
    <g className="summit-keyboard" aria-label="Tastiera Summit a 61 tasti" role="img">
      {Array.from({ length: whiteCount }, (_, index) => (
        <rect
          key={`white-${index}`}
          x={x + index * whiteWidth}
          y={y}
          width={whiteWidth + 0.4}
          height="218"
          className="white-key"
        />
      ))}
      {[...blackAfter].map((index) => (
        <rect
          key={`black-${index}`}
          x={x + (index + 0.7) * whiteWidth}
          y={y}
          width={whiteWidth * 0.6}
          height="132"
          rx="2"
          className="black-key"
        />
      ))}
    </g>
  );
}

export const SummitPanel = memo(function SummitPanel({
  proposal,
  scope,
  selectedParameterId,
  changedIds = [],
  highlightedIds = [],
  highlightedAreaId,
  focusedSectionId,
  showInfoOverlay = false,
  onSelect,
  onChange,
}: {
  proposal: SummitPatchProposal;
  scope: PatchScope;
  selectedParameterId: string | undefined;
  changedIds?: string[];
  highlightedIds?: string[];
  highlightedAreaId?: string | undefined;
  focusedSectionId?: string | undefined;
  showInfoOverlay?: boolean;
  onSelect: (parameterId: string) => void;
  onChange: (parameterId: string, value: ParameterValue) => void;
}) {
  const changed = useMemo(() => new Set(changedIds), [changedIds]);
  const highlighted = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const displaySelection = getDisplaySelection(selectedParameterId);

  return (
    <svg
      className={`summit-panel${showInfoOverlay ? " info-overlay-visible" : ""}`}
      viewBox={summitPanelLayout.viewBox}
      role="group"
      aria-label="Pannello vettoriale interattivo Novation Summit"
      data-scope={scope}
    >
      <defs>
        <linearGradient id="panel-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#34393d" />
          <stop offset=".5" stopColor="#24282b" />
          <stop offset="1" stopColor="#141719" />
        </linearGradient>
        <linearGradient id="wood" x1="0" x2="1">
          <stop offset="0" stopColor="#4d2312" />
          <stop offset=".48" stopColor="#a65a2a" />
          <stop offset="1" stopColor="#3a190c" />
        </linearGradient>
        <linearGradient id="key-white" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fbfaf2" />
          <stop offset=".72" stopColor="#e7e2d5" />
          <stop offset="1" stopColor="#b6afa2" />
        </linearGradient>
        <filter id="control-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="13" y="20" width="1480" height="499" rx="15" fill="#090b0c" />
      <path
        d="M 13 35 Q 13 20 28 20 H 38 V 519 H 28 Q 13 519 13 504 Z"
        fill="url(#wood)"
        className="wood-cheek left"
      />
      <path
        d="M 1459 20 H 1478 Q 1493 20 1493 35 V 504 Q 1493 519 1478 519 H 1459 Z"
        fill="url(#wood)"
        className="wood-cheek right"
      />
      <rect
        x="35"
        y="28"
        width="1424"
        height="254"
        rx="3"
        fill="url(#panel-bg)"
        className="control-deck"
      />
      <path d="M 35 282 H 1459" className="panel-keyboard-rule" />
      <text x="48" y="51" className="panel-wordmark">
        SUMMIT
      </text>
      <text x="1450" y="51" textAnchor="end" className="panel-submark">
        16-VOICE POLYPHONIC SYNTHESISER
      </text>

      {summitPanelLayout.sections
        .filter((section) => !["keyboard", "performance"].includes(section.id))
        .map((section) => (
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
              rx="2"
              className="panel-section"
            />
            <text x={section.x + 4} y={section.y + 10} className="panel-section-label">
              {section.label}
            </text>
          </g>
        ))}

      <SummitOledSvg
        proposal={proposal}
        scope={scope}
        area={displaySelection?.area}
        page={displaySelection?.page}
        selectedParameterId={selectedParameterId}
        x={176}
        y={55}
        width={103}
        height={72}
      />

      {summitPanelLayout.controls.map((control) => {
        if (control.stateOnly) {
          return (
            <StateOnlyControl
              key={control.id}
              control={control}
              highlighted={Boolean(
                highlightedAreaId && control.displayAreaId === highlightedAreaId,
              )}
            />
          );
        }
        const candidateIds = [control.parameterId, ...(control.parameterIds ?? [])].filter(
          (candidate): candidate is string => Boolean(candidate),
        );
        const visibleCandidate = (candidate: string) => {
          const definition = parameterById.get(candidate);
          return definition && isDefinitionVisible(definition, scope);
        };
        const parameterId =
          (selectedParameterId &&
          candidateIds.includes(selectedParameterId) &&
          visibleCandidate(selectedParameterId)
            ? selectedParameterId
            : undefined) ?? candidateIds.find(visibleCandidate);
        if (!parameterId) {
          return (
            <UnavailableControl
              key={control.id}
              label={control.label}
              type={control.type}
              x={control.x}
              y={control.y}
              size={control.size}
              reason="Nessun parametro patch applicabile allo scope attivo."
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
              reason={
                definition?.verificationNote ??
                "Parametro non verificato per il firmware selezionato."
              }
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
                  ? "Impostazione globale esclusa dalla patch."
                  : "Default sicuro non documentato."
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

      <SummitPitchWheel id="pitch-wheel" label="Pitch wheel" x={78} y={409} size={72} />
      <SummitModWheel id="mod-wheel" label="Modulation wheel" x={132} y={409} size={72} />
      <SummitKeyboard />
      <text x="40" y="513" className="panel-footnote">
        FIRMWARE {catalogTarget.primaryFirmware} · PATCH ARCHITECT OPERATIONAL MAP
      </text>
    </svg>
  );
});
