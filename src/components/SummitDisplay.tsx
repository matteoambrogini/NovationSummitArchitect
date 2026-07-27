import type { SummitDisplayArea, SummitDisplayField, SummitDisplayPage } from "../domain/catalog";
import {
  getDisplayFieldValue,
  getMatrixFieldValue,
  isMatrixDisplayAreaId,
  isMatrixDisplayFieldId,
} from "../domain/displayStructure";
import type { PatchScope } from "../domain/patchUi";
import type { SummitPatchProposal } from "../domain/schemas";

type DisplayProps = {
  proposal: SummitPatchProposal;
  scope: PatchScope;
  area?: SummitDisplayArea | undefined;
  page?: SummitDisplayPage | undefined;
  activeSlot?: number | undefined;
  selectedDisplayFieldId?: string | undefined;
  selectedParameterId?: string | undefined;
  onFieldSelect?: ((fieldId: string) => void) | undefined;
};

type DisplayRow = {
  field: SummitDisplayField;
  value: string;
  selectable: boolean;
  selected: boolean;
};

function displayRows({
  proposal,
  scope,
  area,
  page,
  activeSlot,
  selectedDisplayFieldId,
  selectedParameterId,
}: DisplayProps): DisplayRow[] {
  const fields = area?.kind === "slots" ? (area.slotFields ?? []) : (page?.fields ?? []);
  return fields.map((field) => {
    const matrixValue =
      area &&
      area.kind === "slots" &&
      isMatrixDisplayAreaId(area.id) &&
      isMatrixDisplayFieldId(field.id)
        ? getMatrixFieldValue(proposal, scope, area.id, activeSlot ?? 1, field.id)
        : undefined;
    return {
      field,
      value:
        matrixValue === undefined
          ? getDisplayFieldValue(proposal, scope, field)
          : String(matrixValue),
      selectable: Boolean(field.parameterId || matrixValue !== undefined),
      selected:
        field.id === selectedDisplayFieldId ||
        (selectedDisplayFieldId === undefined &&
          Boolean(field.parameterId) &&
          field.parameterId === selectedParameterId),
    };
  });
}

function displayHeading(
  proposal: SummitPatchProposal,
  area?: SummitDisplayArea,
  page?: SummitDisplayPage,
  activeSlot = 1,
) {
  if (area?.kind === "slots") {
    return {
      title: `${area.displayLabel} ${activeSlot}`,
      position: `${activeSlot}/${area.slotCount ?? 1}`,
    };
  }
  if (area && page) {
    return {
      title: page.displayTitle,
      position: `${page.page}/${area.pages.length}`,
    };
  }
  return { title: proposal.patch.name, position: "1/1" };
}

export function SummitOledSvg({
  proposal,
  scope,
  area,
  page,
  activeSlot,
  selectedDisplayFieldId,
  selectedParameterId,
  onFieldSelect,
  x,
  y,
  width,
  height,
}: DisplayProps & { x: number; y: number; width: number; height: number }) {
  const rows = displayRows({
    proposal,
    scope,
    area,
    page,
    activeSlot,
    selectedDisplayFieldId,
    selectedParameterId,
  });
  const heading = displayHeading(proposal, area, page, activeSlot);
  if (!area || (area.kind === "pages" && !page) || area.kind === "unobserved") {
    return (
      <g className="panel-display-cluster" data-testid="panel-oled">
        <rect x={x} y={y} width={width} height={height} rx="3" className="oled" />
        <text x={x + 5} y={y + 12} className="oled-title-svg">
          {area?.kind === "unobserved" ? area.displayLabel : heading.title}
        </text>
        <text x={x + 5} y={y + 25} className="oled-small">
          {area?.kind === "unobserved"
            ? "PAGINE NON OSSERVATE"
            : scope === "single"
              ? "SINGLE · PART A"
              : scope === "multi-a"
                ? "MULTI · PART A"
                : "MULTI · PART B"}
        </text>
        <text x={x + 5} y={y + 38} className="oled-small">
          {area?.kind === "unobserved"
            ? "ESCLUSO DALLA PATCH"
            : proposal.patch.category.toUpperCase()}
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
      data-display-page={area.kind === "pages" ? page?.page : undefined}
      data-display-slot={area.kind === "slots" ? activeSlot : undefined}
    >
      <rect x={x} y={y} width={width} height={height} rx="3" className="oled" />
      <text x={x + 5} y={y + 11} className="oled-title-svg">
        {heading.title}
      </text>
      <text x={x + width - 5} y={y + 11} textAnchor="end" className="oled-page-svg">
        {heading.position}
      </text>
      {rows.slice(0, 4).map(({ field, value, selectable, selected }, index) => (
        <g
          key={field.id}
          className={[
            "oled-svg-row",
            selected ? "active" : "",
            selectable ? "selectable" : "unmapped",
          ]
            .filter(Boolean)
            .join(" ")}
          role={selectable ? "button" : undefined}
          tabIndex={selectable ? 0 : undefined}
          aria-label={selectable ? `${field.displayLabel}: ${value}` : undefined}
          data-display-field-id={field.id}
          onClick={selectable ? () => onFieldSelect?.(field.id) : undefined}
          onKeyDown={
            selectable
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onFieldSelect?.(field.id);
                  }
                }
              : undefined
          }
        >
          {selectable ? (
            <rect
              x={x + 3}
              y={rowStart + index * rowGap - 8}
              width={width - 6}
              height={rowGap}
              rx="1"
              className="oled-row-hitbox"
            />
          ) : null}
          {selected ? (
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
  activeSlot,
  selectedDisplayFieldId,
  selectedParameterId,
  onFieldSelect,
}: DisplayProps) {
  const rows = displayRows({
    proposal,
    scope,
    area,
    page,
    activeSlot,
    selectedDisplayFieldId,
    selectedParameterId,
  });
  const heading = displayHeading(proposal, area, page, activeSlot);
  return (
    <div
      className="summit-oled-screen"
      data-display-area={area?.id}
      data-display-page={area?.kind === "pages" ? page?.page : undefined}
      data-display-slot={area?.kind === "slots" ? activeSlot : undefined}
    >
      <div className="summit-oled-header">
        <strong>{heading.title}</strong>
        <span>{heading.position}</span>
      </div>
      {area && area.kind !== "unobserved" ? (
        <div className="summit-oled-fields">
          {rows.map(({ field, value, selectable, selected }) => (
            <DisplayFieldButton
              key={field.id}
              field={field}
              value={value}
              selected={selected}
              selectable={selectable}
              onFieldSelect={onFieldSelect}
            />
          ))}
        </div>
      ) : (
        <div className="summit-oled-patch">
          <strong>
            {area?.kind === "unobserved"
              ? "PAGINE NON OSSERVATE"
              : scope === "single"
                ? "SINGLE · PART A"
                : scope === "multi-a"
                  ? "MULTI · PART A"
                  : "MULTI · PART B"}
          </strong>
          <span>
            {area?.kind === "unobserved"
              ? "ESCLUSO DALLA PATCH"
              : proposal.patch.category.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

function DisplayFieldButton({
  field,
  value,
  selected,
  selectable,
  onFieldSelect,
}: {
  field: SummitDisplayField;
  value: string;
  selected: boolean;
  selectable: boolean;
  onFieldSelect?: ((fieldId: string) => void) | undefined;
}) {
  const className = `summit-oled-field${selected ? " active" : ""}${selectable ? "" : " unmapped"}`;
  if (!selectable) {
    return (
      <div className={className} title={field.unmappedReason}>
        <span>{field.displayLabel}</span>
        <strong>{value}</strong>
      </div>
    );
  }
  return (
    <button className={className} onClick={() => onFieldSelect?.(field.id)}>
      <span>{field.displayLabel}</span>
      <strong>{value}</strong>
    </button>
  );
}
