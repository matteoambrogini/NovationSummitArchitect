import { memo, useMemo } from "react";
import {
  catalogTarget,
  displayAreaById,
  isFirmwareApplicable,
  parameterById,
} from "../domain/catalog";
import {
  getMatrixFieldValue,
  isMatrixDisplayAreaId,
  isMatrixDisplayFieldId,
} from "../domain/displayStructure";
import {
  formatParameterValue,
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
  SummitValueEncoder,
  UnavailableControl,
  type ControlVisualState,
} from "./panel-controls/SummitControls";
import { panelLandmarkById, summitPanelLayout, type LayoutControl } from "./SummitPanelLayout";

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
  active = false,
  disabled = false,
  onClick,
}: {
  control: LayoutControl;
  highlighted: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick?: (() => void) | undefined;
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
        active={active}
        disabled={disabled}
        onClick={onClick}
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
  const keyboard = panelLandmarkById.get("keyboard");
  const x = keyboard?.x ?? 185;
  const y = keyboard?.y ?? 285;
  const width = keyboard?.width ?? 1275;
  const height = keyboard?.height ?? 202;
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
          height={height}
          className="white-key"
        />
      ))}
      {[...blackAfter].map((index) => (
        <rect
          key={`black-${index}`}
          x={x + (index + 0.7) * whiteWidth}
          y={y}
          width={whiteWidth * 0.6}
          height={height * 0.61}
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
  activeDisplayAreaId,
  activeDisplayPage,
  selectedDisplayFieldId,
  activeModulationSlot,
  activeFxModulationSlot,
  changedIds = [],
  highlightedIds = [],
  highlightedAreaId,
  focusedSectionId,
  showInfoOverlay = false,
  onSelect,
  onChange,
  onDisplayAreaSelect,
  onDisplayStep,
  onDisplayFieldSelect,
  onDisplayValueStep,
}: {
  proposal: SummitPatchProposal;
  scope: PatchScope;
  selectedParameterId: string | undefined;
  activeDisplayAreaId: string;
  activeDisplayPage: number;
  selectedDisplayFieldId: string | undefined;
  activeModulationSlot: number;
  activeFxModulationSlot: number;
  changedIds?: string[];
  highlightedIds?: string[];
  highlightedAreaId?: string | undefined;
  focusedSectionId?: string | undefined;
  showInfoOverlay?: boolean;
  onSelect: (parameterId: string) => void;
  onChange: (parameterId: string, value: ParameterValue) => void;
  onDisplayAreaSelect: (areaId: string) => void;
  onDisplayStep: (direction: -1 | 1) => void;
  onDisplayFieldSelect: (fieldId: string) => void;
  onDisplayValueStep: (steps: number) => void;
}) {
  const changed = useMemo(() => new Set(changedIds), [changedIds]);
  const highlighted = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const displayArea = displayAreaById.get(activeDisplayAreaId);
  const displayPage =
    displayArea?.kind === "pages"
      ? displayArea.pages.find((page) => page.page === activeDisplayPage)
      : undefined;
  const activeDisplaySlot =
    activeDisplayAreaId === "mod"
      ? activeModulationSlot
      : activeDisplayAreaId === "fx-mod"
        ? activeFxModulationSlot
        : undefined;
  const displayFields =
    displayArea?.kind === "slots" ? (displayArea.slotFields ?? []) : (displayPage?.fields ?? []);
  const activeDisplayField = displayFields.find((field) => field.id === selectedDisplayFieldId);
  const selectedDisplayParameterId = activeDisplayField?.parameterId;
  const selectedDisplayDefinition = selectedDisplayParameterId
    ? parameterById.get(selectedDisplayParameterId)
    : undefined;
  const selectedDisplaySetting =
    selectedDisplayParameterId && selectedDisplayDefinition
      ? getSetting(proposal, selectedDisplayParameterId, scope)
      : undefined;
  const matrixDisplayValue =
    displayArea &&
    isMatrixDisplayAreaId(displayArea.id) &&
    activeDisplaySlot &&
    activeDisplayField &&
    isMatrixDisplayFieldId(activeDisplayField.id)
      ? getMatrixFieldValue(
          proposal,
          scope,
          displayArea.id,
          activeDisplaySlot,
          activeDisplayField.id,
        )
      : undefined;
  const valueEncoderText =
    matrixDisplayValue !== undefined
      ? String(matrixDisplayValue)
      : selectedDisplayDefinition && selectedDisplaySetting
        ? formatParameterValue(selectedDisplayDefinition, selectedDisplaySetting.value)
        : "—";
  const valueEncoderDisabled =
    matrixDisplayValue === undefined &&
    (!selectedDisplayDefinition ||
      !selectedDisplaySetting ||
      selectedDisplayDefinition.scope === "global");
  const displayAtFirst =
    displayArea?.kind === "slots" ? activeDisplaySlot === 1 : activeDisplayPage <= 1;
  const displayAtLast =
    displayArea?.kind === "slots"
      ? activeDisplaySlot === displayArea.slotCount
      : displayArea?.kind === "pages"
        ? activeDisplayPage >= displayArea.pages.length
        : true;
  const panelBody = panelLandmarkById.get("panel");
  const displayLandmark = panelLandmarkById.get("display");
  const pitchWheel = panelLandmarkById.get("pitch-wheel");
  const modWheel = panelLandmarkById.get("mod-wheel");

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

      <rect
        x={panelBody?.x ?? 14}
        y={panelBody?.y ?? 41}
        width={panelBody?.width ?? 1484}
        height={panelBody?.height ?? 446}
        rx="7"
        fill="#090b0c"
      />
      <path
        d="M 14 49 Q 14 41 23 41 H 35 V 487 H 23 Q 14 487 14 478 Z"
        fill="url(#wood)"
        className="wood-cheek left"
      />
      <path
        d="M 1474 41 H 1489 Q 1498 41 1498 50 V 478 Q 1498 487 1489 487 H 1474 Z"
        fill="url(#wood)"
        className="wood-cheek right"
      />
      <rect
        x="35"
        y="42"
        width="1439"
        height="243"
        rx="1"
        fill="url(#panel-bg)"
        className="control-deck"
      />
      <rect x="35" y="285" width="150" height="202" fill="url(#panel-bg)" />
      <path d="M 35 285 H 1474" className="panel-keyboard-rule" />
      <text x="1459" y="61" textAnchor="end" className="panel-wordmark">
        SUMMIT
      </text>
      <text x="184" y="278" className="panel-submark">
        OXFORD OSCILLATORS
      </text>
      <text x="1457" y="276" textAnchor="end" className="panel-submark">
        BI-TIMBRAL POLYPHONIC SYNTHESISER
      </text>

      {summitPanelLayout.sections.map((section) => (
        <g
          key={section.id}
          className={`panel-section-group${focusedSectionId === section.id ? " focused" : ""}`}
          data-section-id={section.id}
        >
          {focusedSectionId === section.id ? (
            <rect
              x={section.x}
              y={section.y}
              width={section.width}
              height={section.height}
              rx="1"
              className="panel-focus-region"
            />
          ) : null}
        </g>
      ))}

      {summitPanelLayout.serigraphy.map((mark) => (
        <g key={mark.id} className="panel-serigraphy" data-serigraphy-id={mark.id}>
          <line x1={mark.x} y1={mark.y} x2={mark.x + mark.width} y2={mark.y} />
          <text x={mark.x} y={mark.y - 4}>
            {mark.label}
          </text>
        </g>
      ))}

      <SummitOledSvg
        proposal={proposal}
        scope={scope}
        area={displayArea}
        page={displayPage}
        activeSlot={activeDisplaySlot}
        selectedDisplayFieldId={selectedDisplayFieldId}
        selectedParameterId={selectedParameterId}
        onFieldSelect={onDisplayFieldSelect}
        x={displayLandmark?.x ?? 164}
        y={displayLandmark?.y ?? 135}
        width={displayLandmark?.width ?? 110}
        height={displayLandmark?.height ?? 44}
      />

      {summitPanelLayout.controls.map((control) => {
        if (control.stateOnly) {
          if (control.id === "menu-value") {
            return (
              <SummitValueEncoder
                key={control.id}
                id={control.id}
                label={control.label}
                valueText={valueEncoderText}
                x={control.x}
                y={control.y}
                size={control.size}
                active={!valueEncoderDisabled}
                disabled={valueEncoderDisabled}
                onSelect={() => {
                  if (activeDisplayField) onDisplayFieldSelect(activeDisplayField.id);
                }}
                onStep={onDisplayValueStep}
              />
            );
          }
          const rowIndex = control.id.startsWith("menu-row-")
            ? Number(control.id.replace("menu-row-", "")) - 1
            : undefined;
          const rowField =
            rowIndex !== undefined && Number.isInteger(rowIndex)
              ? displayFields[rowIndex]
              : undefined;
          const isPageLeft = control.id === "menu-page-left";
          const isPageRight = control.id === "menu-page-right";
          const displayAreaId = control.displayAreaId;
          const onHardwareClick = displayAreaId
            ? () => onDisplayAreaSelect(displayAreaId)
            : isPageLeft
              ? () => onDisplayStep(-1)
              : isPageRight
                ? () => onDisplayStep(1)
                : rowField
                  ? () => onDisplayFieldSelect(rowField.id)
                  : undefined;
          return (
            <StateOnlyControl
              key={control.id}
              control={control}
              highlighted={Boolean(
                highlightedAreaId && control.displayAreaId === highlightedAreaId,
              )}
              active={Boolean(
                (control.displayAreaId && control.displayAreaId === activeDisplayAreaId) ||
                (rowField && rowField.id === selectedDisplayFieldId),
              )}
              disabled={Boolean(
                (isPageLeft && displayAtFirst) ||
                (isPageRight && displayAtLast) ||
                (rowIndex !== undefined && !rowField),
              )}
              onClick={onHardwareClick}
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

      <SummitPitchWheel
        id="pitch-wheel"
        label="Pitch wheel"
        x={pitchWheel ? pitchWheel.x + pitchWheel.width / 2 : 78}
        y={pitchWheel ? pitchWheel.y + pitchWheel.height / 2 : 372}
        size={pitchWheel?.height ?? 84}
      />
      <SummitModWheel
        id="mod-wheel"
        label="Modulation wheel"
        x={modWheel ? modWheel.x + modWheel.width / 2 : 130}
        y={modWheel ? modWheel.y + modWheel.height / 2 : 372}
        size={modWheel?.height ?? 84}
      />
      <SummitKeyboard />
      <text x="38" y="483" className="panel-footnote">
        FIRMWARE {catalogTarget.primaryFirmware} · PATCH ARCHITECT OPERATIONAL MAP
      </text>
    </svg>
  );
});
