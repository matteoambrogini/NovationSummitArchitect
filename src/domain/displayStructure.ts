import {
  displayLocationByParameterId,
  displayStructure,
  fxModulationCatalog,
  modulationCatalog,
  parameterById,
  type SummitDisplayArea,
  type SummitDisplayField,
  type SummitDisplayPage,
} from "./catalog";
import {
  completeMatrixSlots,
  formatParameterValue,
  getMenuNavigation,
  getScopePart,
  getSetting,
  type PatchScope,
} from "./patchUi";
import type { SummitPatchProposal } from "./schemas";

export type DisplaySelection = {
  area: SummitDisplayArea;
  page: SummitDisplayPage;
  field?: SummitDisplayField | undefined;
};

export type SetupFilter = "all" | "physical" | "menu";
export type MatrixDisplayAreaId = "mod" | "fx-mod";
export type MatrixDisplayFieldId = "sourceA" | "sourceB" | "destination" | "depth";
export type MatrixDisplayValue = string | number;

export type PatchSetupItem = {
  id: string;
  kind: "physical" | "menu";
  areaId: string;
  area: string;
  instruction: string;
  parameterIds: string[];
  value: string;
  modified: boolean;
  page?: number | undefined;
  row?: number | undefined;
  slot?: number | undefined;
};

export const observedPageAreas = displayStructure.areas.filter(
  (area) => area.kind === "pages" && area.patchRelevant,
);
export const patchDisplayAreas = displayStructure.areas.filter((area) => area.patchRelevant);

export function isMatrixDisplayAreaId(areaId: string): areaId is MatrixDisplayAreaId {
  return areaId === "mod" || areaId === "fx-mod";
}

export function isMatrixDisplayFieldId(fieldId: string): fieldId is MatrixDisplayFieldId {
  return (
    fieldId === "sourceA" ||
    fieldId === "sourceB" ||
    fieldId === "destination" ||
    fieldId === "depth"
  );
}

export function getDisplayArea(areaId: string): SummitDisplayArea {
  return (
    displayStructure.areas.find((area) => area.id === areaId) ??
    observedPageAreas[0] ??
    (() => {
      throw new Error("La struttura display non contiene aree navigabili");
    })()
  );
}

export function boundedDisplayPage(area: SummitDisplayArea, page: number): number {
  if (area.kind !== "pages") return 1;
  return Math.max(1, Math.min(area.pages.length, page));
}

export function firstMappedDisplayField(
  area: SummitDisplayArea,
  page: number,
): SummitDisplayField | undefined {
  if (area.kind !== "pages") return undefined;
  return area.pages
    .find((candidate) => candidate.page === boundedDisplayPage(area, page))
    ?.fields.find((field) => field.parameterId);
}

export function getDisplaySelection(parameterId?: string): DisplaySelection | undefined {
  if (!parameterId) return undefined;
  return displayLocationByParameterId.get(parameterId);
}

export function getMatrixAssignment(
  proposal: SummitPatchProposal,
  scope: PatchScope,
  areaId: MatrixDisplayAreaId,
  slot: number,
) {
  const part = getScopePart(proposal, scope);
  const kind = areaId === "mod" ? "mod" : "fx";
  const assignments = areaId === "mod" ? part.modulationMatrix : part.fxModulationMatrix;
  return completeMatrixSlots(assignments, kind)[slot - 1];
}

export function getMatrixFieldValue(
  proposal: SummitPatchProposal,
  scope: PatchScope,
  areaId: MatrixDisplayAreaId,
  slot: number,
  fieldId: MatrixDisplayFieldId,
): MatrixDisplayValue {
  const assignment = getMatrixAssignment(proposal, scope, areaId, slot);
  if (!assignment) return fieldId === "depth" ? 0 : "direct";
  if (fieldId === "sourceB") return assignment.sourceB ?? "direct";
  return assignment[fieldId];
}

export function stepMatrixFieldValue(
  proposal: SummitPatchProposal,
  scope: PatchScope,
  areaId: MatrixDisplayAreaId,
  slot: number,
  fieldId: MatrixDisplayFieldId,
  direction: -1 | 1,
  multiplier = 1,
): MatrixDisplayValue {
  const catalog = areaId === "mod" ? modulationCatalog : fxModulationCatalog;
  const current = getMatrixFieldValue(proposal, scope, areaId, slot, fieldId);
  if (fieldId === "depth") {
    const [minimum, maximum] = catalog.depthRange;
    const numeric = typeof current === "number" ? current : 0;
    return Math.max(minimum, Math.min(maximum, numeric + direction * multiplier));
  }
  const entities = fieldId === "destination" ? catalog.destinations : catalog.sources;
  const ids = entities
    .filter((entity) => entity.verificationStatus === "verified")
    .map((entity) => entity.id);
  const currentIndex = Math.max(0, ids.indexOf(String(current)));
  const nextIndex = Math.max(0, Math.min(ids.length - 1, currentIndex + direction * multiplier));
  return ids[nextIndex] ?? String(current);
}

export function getDisplayFieldValue(
  proposal: SummitPatchProposal,
  scope: PatchScope,
  field: SummitDisplayField,
): string {
  if (!field.parameterId) {
    if (field.fieldKind === "action") return ">";
    if (field.fieldKind === "status") return "—";
    return "N/D";
  }
  const definition = parameterById.get(field.parameterId);
  if (!definition) return "N/D";
  const setting = getSetting(proposal, field.parameterId, scope);
  if (setting) return formatParameterValue(definition, setting.value);
  const defaultValue = definition.defaultValue;
  if (
    typeof defaultValue === "string" ||
    typeof defaultValue === "number" ||
    typeof defaultValue === "boolean"
  ) {
    return formatParameterValue(definition, defaultValue);
  }
  return "N/D";
}

function displaySetupItems(proposal: SummitPatchProposal, scope: PatchScope): PatchSetupItem[] {
  const part = getScopePart(proposal, scope);
  const patchSettings = [
    ...part.panelControls,
    ...part.menuSettings,
    ...(proposal.multiSetup
      ? [...proposal.multiSetup.panelControls, ...proposal.multiSetup.menuSettings]
      : []),
  ];
  const seen = new Set<string>();
  const items: PatchSetupItem[] = [];
  for (const setting of patchSettings) {
    if (seen.has(setting.parameterId)) continue;
    seen.add(setting.parameterId);
    const definition = parameterById.get(setting.parameterId);
    if (!definition || definition.scope === "global") continue;
    const value = formatParameterValue(definition, setting.value);
    const navigation = getMenuNavigation(definition, value);
    const kind = navigation ? "menu" : "physical";
    const pagePresses =
      navigation?.pageRightPresses && navigation.pageRightPresses > 0
        ? `, premi PAGE > ${navigation.pageRightPresses} ${navigation.pageRightPresses === 1 ? "volta" : "volte"}`
        : "";
    const instruction = navigation
      ? `Premi ${navigation.menu.toUpperCase()}${pagePresses}; seleziona ${navigation.parameterLabel} e imposta ${value}.`
      : `Nella sezione ${definition.section.toUpperCase()}, imposta ${definition.label} su ${value}.`;
    items.push({
      id: `parameter:${setting.parameterId}`,
      kind,
      areaId: navigation?.areaId ?? definition.section.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
      area: navigation?.menu.toUpperCase() ?? definition.section.toUpperCase(),
      instruction,
      parameterIds: [setting.parameterId],
      value,
      modified: setting.value !== definition.defaultValue,
      ...(navigation && typeof navigation.page === "number" ? { page: navigation.page } : {}),
      ...(navigation?.row ? { row: navigation.row } : {}),
    });
  }
  return items;
}

function matrixSetupItems(proposal: SummitPatchProposal, scope: PatchScope): PatchSetupItem[] {
  const part = getScopePart(proposal, scope);
  const definitions: Array<{
    kind: "mod" | "fx";
    areaId: "mod" | "fx-mod";
    label: "MOD" | "FX MOD";
    assignments: typeof part.modulationMatrix;
  }> = [
    { kind: "mod", areaId: "mod", label: "MOD", assignments: part.modulationMatrix },
    { kind: "fx", areaId: "fx-mod", label: "FX MOD", assignments: part.fxModulationMatrix },
  ];
  return definitions.flatMap(({ kind, areaId, label, assignments }) =>
    completeMatrixSlots(assignments, kind).map((assignment) => {
      const sourceB = assignment.sourceB ?? "direct";
      const value = `${assignment.sourceA} + ${sourceB} → ${assignment.destination} · ${assignment.depth >= 0 ? "+" : ""}${assignment.depth}`;
      return {
        id: `${areaId}:slot:${assignment.slot}`,
        kind: "menu" as const,
        areaId,
        area: label,
        instruction: `Premi ${label}, apri lo slot ${assignment.slot}; imposta Source A ${assignment.sourceA}, Source B ${sourceB}, Destination ${assignment.destination}, Depth ${assignment.depth >= 0 ? "+" : ""}${assignment.depth}.`,
        parameterIds: [],
        value,
        modified: assignment.depth !== 0,
        slot: assignment.slot,
      };
    }),
  );
}

export function buildPatchSetupChecklist(
  proposal: SummitPatchProposal,
  scope: PatchScope,
  filter: SetupFilter = "all",
  onlyModified = false,
): PatchSetupItem[] {
  return [...displaySetupItems(proposal, scope), ...matrixSetupItems(proposal, scope)].filter(
    (item) => (filter === "all" || item.kind === filter) && (!onlyModified || item.modified),
  );
}
