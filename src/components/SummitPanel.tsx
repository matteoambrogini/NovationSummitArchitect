import layoutJson from "../data/summit-control-layout.json";
import { parameterById } from "../domain/catalog";
import type { SummitPatchProposal } from "../domain/schemas";

type LayoutControl = {
  id: string;
  parameterId?: string;
  parameterIds?: string[];
  label: string;
  type: "knob" | "slider" | "selector" | "button" | "toggle" | "encoder" | "led";
  x: number;
  y: number;
  size?: number;
  stateOnly?: boolean;
};

const layout = layoutJson as {
  viewBox: string;
  sections: Array<{ id: string; label: string; x: number; y: number; width: number; height: number }>;
  controls: LayoutControl[];
};

function normalizedValue(parameterId: string, value: string | number | boolean): number {
  const definition = parameterById.get(parameterId);
  if (typeof value === "number" && definition?.minimum !== undefined && definition.maximum !== undefined) {
    return (value - definition.minimum) / (definition.maximum - definition.minimum);
  }
  if (definition?.enumValues) {
    const index = definition.enumValues.indexOf(String(value));
    return index / Math.max(1, definition.enumValues.length - 1);
  }
  return value ? 1 : 0;
}

export function SummitPanel({
  proposal,
  selectedParameterId,
  changedIds = [],
  highlightedIds = [],
  onSelect,
}: {
  proposal: SummitPatchProposal;
  selectedParameterId: string | undefined;
  changedIds?: string[];
  highlightedIds?: string[];
  onSelect: (parameterId: string) => void;
}) {
  const settings = new Map(
    proposal.parts.flatMap((part) =>
      part.panelControls.map((setting) => [setting.parameterId, setting] as const),
    ),
  );

  return (
    <div className="panel-scroll">
      <svg className="summit-panel" viewBox={layout.viewBox} role="group" aria-label="Rappresentazione funzionale del pannello Novation Summit">
        <defs>
          <linearGradient id="panel-bg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#252a2e" /><stop offset="1" stopColor="#111416" /></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="4" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect x="8" y="8" width="1584" height="544" rx="22" fill="url(#panel-bg)" stroke="#3a4146" strokeWidth="2" />
        <text x="42" y="34" className="panel-wordmark">SUMMIT</text>
        <text x="1555" y="34" textAnchor="end" className="panel-submark">PATCH ARCHITECT · FUNCTIONAL VIEW</text>
        {layout.sections.map((section) => (
          <g key={section.id}>
            <rect x={section.x} y={section.y} width={section.width} height={section.height} rx="9" className="panel-section" />
            <text x={section.x + 12} y={section.y + 22} className="panel-section-label">{section.label}</text>
          </g>
        ))}
        <rect x="58" y="110" width="122" height="74" rx="5" className="oled" />
        <text x="119" y="137" textAnchor="middle" className="oled-text">{proposal.patch.name}</text>
        <text x="119" y="158" textAnchor="middle" className="oled-small">{proposal.patch.category.toUpperCase()} · PART A</text>
        <rect x="66" y="216" width="106" height="18" rx="9" className="voice-meter-bg" />
        <rect x="66" y="216" width={Math.max(20, proposal.analysis.overallConfidence * 106)} height="18" rx="9" className="voice-meter" />
        <text x="119" y="270" textAnchor="middle" className="panel-small">CONFIDENCE</text>
        <text x="119" y="301" textAnchor="middle" className="panel-value">{Math.round(proposal.analysis.overallConfidence * 100)}%</text>
        {layout.controls.map((control) => {
          const parameterId = [control.parameterId, ...(control.parameterIds ?? [])]
            .filter((candidate): candidate is string => Boolean(candidate))
            .find((candidate) => settings.has(candidate));
          if (!parameterId || control.stateOnly) return null;
          const setting = settings.get(parameterId);
          if (!setting) return null;
          const normalized = normalizedValue(parameterId, setting.value);
          const selected = selectedParameterId === parameterId;
          const changed = changedIds.includes(parameterId);
          const highlighted = highlightedIds.includes(parameterId);
          const classes = ["panel-control", selected ? "selected" : "", changed ? "changed" : "", highlighted ? "highlighted" : ""].filter(Boolean).join(" ");
          const activate = () => onSelect(parameterId);
          if (control.type === "slider") {
            const y = control.y + 78 - normalized * 132;
            return (
              <g key={control.id} className={classes} role="button" tabIndex={0} aria-label={`${control.label}: ${setting.displayValue}`} onClick={activate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") activate(); }}>
                <text x={control.x} y={control.y - 112} textAnchor="middle" className="control-label">{control.label}</text>
                <line x1={control.x} y1={control.y - 82} x2={control.x} y2={control.y + 78} className="slider-track" />
                <rect x={control.x - 14} y={y - 5} width="28" height="10" rx="3" className="slider-handle" />
                <text x={control.x} y={control.y + 103} textAnchor="middle" className="control-value">{setting.displayValue}</text>
              </g>
            );
          }
          const size = control.size ?? 64;
          const radius = size / 2;
          const rotation = -135 + normalized * 270;
          return (
            <g key={control.id} className={classes} role="button" tabIndex={0} aria-label={`${control.label}: ${setting.displayValue}`} onClick={activate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") activate(); }}>
              <text x={control.x} y={control.y - radius - 17} textAnchor="middle" className="control-label">{control.label}</text>
              <circle cx={control.x} cy={control.y} r={radius + 8} className="control-halo" />
              <circle cx={control.x} cy={control.y} r={radius} className={control.type === "selector" ? "selector-body" : "knob-body"} />
              <line x1={control.x} y1={control.y} x2={control.x} y2={control.y - radius + 10} className="knob-indicator" transform={`rotate(${rotation} ${control.x} ${control.y})`} />
              <text x={control.x} y={control.y + radius + 28} textAnchor="middle" className="control-value">{setting.displayValue}</text>
              <circle cx={control.x + radius - 3} cy={control.y - radius + 2} r="4" className="control-led" filter={highlighted ? "url(#glow)" : undefined} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
