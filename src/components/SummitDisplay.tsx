import type { SummitDisplayArea, SummitDisplayField, SummitDisplayPage } from "../domain/catalog";
import { getDisplayFieldValue } from "../domain/displayStructure";
import type { PatchScope } from "../domain/patchUi";
import type { SummitPatchProposal } from "../domain/schemas";

type DisplayProps = {
  proposal: SummitPatchProposal;
  scope: PatchScope;
  area?: SummitDisplayArea | undefined;
  page?: SummitDisplayPage | undefined;
  selectedParameterId?: string | undefined;
  onSelect?: ((parameterId: string) => void) | undefined;
};

function displayRows({ proposal, scope, page }: Pick<DisplayProps, "proposal" | "scope" | "page">) {
  return (page?.fields ?? []).map((field) => ({
    field,
    value: getDisplayFieldValue(proposal, scope, field),
  }));
}

export function SummitOledSvg({
  proposal,
  scope,
  area,
  page,
  selectedParameterId,
  x,
  y,
  width,
  height,
}: DisplayProps & { x: number; y: number; width: number; height: number }) {
  const rows = displayRows({ proposal, scope, page });
  if (!area || !page) {
    return (
      <g className="panel-display-cluster" data-testid="panel-oled">
        <rect x={x} y={y} width={width} height={height} rx="3" className="oled" />
        <text x={x + 5} y={y + 12} className="oled-title-svg">
          1/1 {proposal.patch.name}
        </text>
        <text x={x + 5} y={y + 25} className="oled-small">
          {scope === "single"
            ? "SINGLE · PART A"
            : scope === "multi-a"
              ? "MULTI · PART A"
              : "MULTI · PART B"}
        </text>
        <text x={x + 5} y={y + 38} className="oled-small">
          {proposal.patch.category.toUpperCase()}
        </text>
      </g>
    );
  }
  const rowStart = y + 24;
  const rowGap = Math.min(12, (height - 26) / Math.max(1, rows.length));
  return (
    <g
      className="panel-display-cluster"
      data-testid="panel-oled"
      data-display-area={area.id}
      data-display-page={page.page}
    >
      <rect x={x} y={y} width={width} height={height} rx="3" className="oled" />
      <text x={x + 5} y={y + 11} className="oled-title-svg">
        {page.displayTitle}
      </text>
      <text x={x + width - 5} y={y + 11} textAnchor="end" className="oled-page-svg">
        {page.page}/{area.pages.length}
      </text>
      {rows.slice(0, 4).map(({ field, value }, index) => (
        <g
          key={field.id}
          className={
            field.parameterId === selectedParameterId ? "oled-svg-row active" : "oled-svg-row"
          }
        >
          {field.parameterId === selectedParameterId ? (
            <rect
              x={x + 3}
              y={rowStart + index * rowGap - 8}
              width={width - 6}
              height={rowGap}
              rx="1"
              className="oled-row-selection"
            />
          ) : null}
          <text x={x + 6} y={rowStart + index * rowGap} className="oled-field-svg">
            {field.displayLabel}
          </text>
          <text
            x={x + width - 6}
            y={rowStart + index * rowGap}
            textAnchor="end"
            className="oled-value-svg"
          >
            {value}
          </text>
        </g>
      ))}
    </g>
  );
}

export function SummitOledScreen({
  proposal,
  scope,
  area,
  page,
  selectedParameterId,
  onSelect,
}: DisplayProps) {
  const rows = displayRows({ proposal, scope, page });
  return (
    <div className="summit-oled-screen" data-display-area={area?.id} data-display-page={page?.page}>
      <div className="summit-oled-header">
        <strong>{page?.displayTitle ?? proposal.patch.name}</strong>
        <span>{area && page ? `${page.page}/${area.pages.length}` : "1/1"}</span>
      </div>
      {area && page ? (
        <div className="summit-oled-fields">
          {rows.map(({ field, value }) => (
            <DisplayFieldButton
              key={field.id}
              field={field}
              value={value}
              selected={field.parameterId === selectedParameterId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="summit-oled-patch">
          <strong>
            {scope === "single"
              ? "SINGLE · PART A"
              : scope === "multi-a"
                ? "MULTI · PART A"
                : "MULTI · PART B"}
          </strong>
          <span>{proposal.patch.category.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

function DisplayFieldButton({
  field,
  value,
  selected,
  onSelect,
}: {
  field: SummitDisplayField;
  value: string;
  selected: boolean;
  onSelect?: ((parameterId: string) => void) | undefined;
}) {
  const className = `summit-oled-field${selected ? " active" : ""}${field.parameterId ? "" : " unmapped"}`;
  if (!field.parameterId) {
    return (
      <div className={className} title={field.unmappedReason}>
        <span>{field.displayLabel}</span>
        <strong>{value}</strong>
      </div>
    );
  }
  return (
    <button className={className} onClick={() => onSelect?.(field.parameterId!)}>
      <span>{field.displayLabel}</span>
      <strong>{value}</strong>
    </button>
  );
}
