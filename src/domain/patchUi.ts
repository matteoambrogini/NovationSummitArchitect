import {
  catalogTarget,
  displayLocationByParameterId,
  fxModulationCatalog,
  isFirmwareApplicable,
  menuByLabel,
  modulationCatalog,
  parameterById,
  parameterCatalog,
} from "./catalog";
import type { SummitParameterDefinition, SummitPatchProposal } from "./schemas";

export type PatchScope = "single" | "multi-a" | "multi-b";
export type ParameterValue = string | number | boolean;
export type PatchSetting = SummitPatchProposal["parts"][number]["panelControls"][number];
export type MatrixAssignment = SummitPatchProposal["parts"][number]["modulationMatrix"][number];

export function isParameterValue(value: unknown): value is ParameterValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function formatParameterValue(
  definition: SummitParameterDefinition,
  value: ParameterValue,
): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  return `${String(value)}${definition.unit ? ` ${definition.unit}` : ""}`;
}

export function isDefinitionVisible(
  definition: SummitParameterDefinition,
  scope: PatchScope,
  targetFirmware = catalogTarget.primaryFirmware,
): boolean {
  if (!isFirmwareApplicable(definition, targetFirmware)) return false;
  if (scope === "single") {
    return definition.scope !== "multi" && definition.singleMultiApplicability !== "multi";
  }
  if (definition.scope === "multi" || definition.scope === "global") return true;
  const part = scope === "multi-a" ? "A" : "B";
  return (
    definition.singleMultiApplicability !== "single" &&
    (!definition.partApplicability ||
      definition.partApplicability === "both" ||
      definition.partApplicability === part)
  );
}

function defaultSetting(
  definition: SummitParameterDefinition,
  value: ParameterValue,
): PatchSetting {
  return {
    parameterId: definition.id,
    value,
    displayValue: formatParameterValue(definition, value),
    confidence: 1,
    rationale: "Valore predefinito verificato del catalogo Summit.",
  };
}

export function buildDefaultPartSettings() {
  const panelControls: SummitPatchProposal["parts"][number]["panelControls"] = [];
  const menuSettings: SummitPatchProposal["parts"][number]["menuSettings"] = [];
  for (const definition of parameterCatalog) {
    if (
      definition.scope !== "part" ||
      definition.verificationStatus !== "verified" ||
      !definition.aiExposed ||
      !isFirmwareApplicable(definition, catalogTarget.primaryFirmware) ||
      !isParameterValue(definition.defaultValue)
    ) {
      continue;
    }
    const setting = defaultSetting(definition, definition.defaultValue);
    if (definition.location.type === "panel") {
      panelControls.push(setting);
    } else {
      menuSettings.push({
        ...setting,
        menu: definition.location.menu,
        page: definition.location.page,
      });
    }
  }
  return { panelControls, menuSettings };
}

export function buildDefaultMultiSettings() {
  const panelControls: SummitPatchProposal["multiSetup"] extends infer Setup
    ? Setup extends { panelControls: infer Controls }
      ? Controls
      : never
    : never = [];
  const menuSettings: SummitPatchProposal["multiSetup"] extends infer Setup
    ? Setup extends { menuSettings: infer Settings }
      ? Settings
      : never
    : never = [];
  for (const definition of parameterCatalog) {
    if (
      definition.scope !== "multi" ||
      definition.verificationStatus !== "verified" ||
      !definition.aiExposed ||
      !isParameterValue(definition.defaultValue)
    ) {
      continue;
    }
    const setting = defaultSetting(definition, definition.defaultValue);
    if (definition.location.type === "panel") {
      panelControls.push(setting);
    } else {
      menuSettings.push({
        ...setting,
        menu: definition.location.menu,
        page: definition.location.page,
      });
    }
  }
  return { panelControls, menuSettings };
}

export function applySettingOverrides(
  settings: ReturnType<typeof buildDefaultPartSettings>,
  overrides: Readonly<Record<string, ParameterValue>>,
) {
  for (const setting of [...settings.panelControls, ...settings.menuSettings]) {
    const override = overrides[setting.parameterId];
    if (override === undefined) continue;
    const definition = parameterById.get(setting.parameterId);
    if (!definition) continue;
    setting.value = override;
    setting.displayValue = formatParameterValue(definition, override);
    setting.confidence = 0.82;
    setting.rationale = "Valore suggerito dalla fixture demo e validato contro il catalogo.";
  }
  return settings;
}

export function getScopePart(
  proposal: SummitPatchProposal,
  scope: PatchScope,
): SummitPatchProposal["parts"][number] {
  const requestedPart = scope === "multi-b" ? "B" : "A";
  return proposal.parts.find((part) => part.part === requestedPart) ?? proposal.parts[0]!;
}

export function getSetting(
  proposal: SummitPatchProposal,
  parameterId: string,
  scope: PatchScope,
): PatchSetting | undefined {
  const definition = parameterById.get(parameterId);
  if (definition?.scope === "multi") {
    return proposal.multiSetup
      ? [...proposal.multiSetup.panelControls, ...proposal.multiSetup.menuSettings].find(
          (setting) => setting.parameterId === parameterId,
        )
      : undefined;
  }
  if (definition?.scope === "global") return undefined;
  const part = getScopePart(proposal, scope);
  return [...part.panelControls, ...part.menuSettings].find(
    (setting) => setting.parameterId === parameterId,
  );
}

export type MenuNavigation = {
  areaId: string;
  menu: string;
  page: number | string;
  pageCount: number | undefined;
  pageRightPresses: number | undefined;
  row: number | undefined;
  parameterLabel: string;
  value: string;
  verified: boolean;
  uncertainty: string | undefined;
};

export function getMenuNavigation(
  definition: SummitParameterDefinition,
  value: string,
): MenuNavigation | undefined {
  const observed = displayLocationByParameterId.get(definition.id);
  if (observed) {
    return {
      areaId: observed.area.id,
      menu: observed.area.physicalButton,
      page: observed.page.page,
      pageCount: observed.area.pages.length,
      pageRightPresses: observed.page.page - 1,
      row: observed.field.line,
      parameterLabel: observed.field.displayLabel,
      value,
      verified: true,
      uncertainty: undefined,
    };
  }
  if (definition.location.type !== "menu") return undefined;
  const menu = menuByLabel.get(definition.location.menu.toLowerCase());
  const conflictNote =
    menu?.verificationStatus === "conflict"
      ? (menu.documentation.verification?.note ??
        "La numerazione delle pagine presenta un conflitto documentato.")
      : undefined;
  return {
    areaId: definition.location.menu.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
    menu: definition.location.menu,
    page: definition.location.page,
    pageCount: typeof menu?.pageCount === "number" ? menu.pageCount : undefined,
    pageRightPresses:
      typeof definition.location.page === "number"
        ? Math.max(0, definition.location.page - 1)
        : undefined,
    row: definition.location.row,
    parameterLabel: definition.shortDisplayLabel ?? definition.label,
    value,
    verified:
      definition.verificationStatus === "verified" && menu?.verificationStatus === "verified",
    uncertainty: conflictNote,
  };
}

function matrixDefaults(catalog: typeof modulationCatalog): MatrixAssignment[] {
  return catalog.slotDefinitions.map((slot) => {
    const field = (id: "sourceA" | "sourceB" | "destination" | "depth") =>
      slot.fields.find((candidate) => candidate.id === id)?.defaultValue;
    const sourceA = field("sourceA");
    const sourceB = field("sourceB");
    const destination = field("destination");
    const depth = field("depth");
    if (
      typeof sourceA !== "string" ||
      typeof sourceB !== "string" ||
      typeof destination !== "string" ||
      typeof depth !== "number"
    ) {
      throw new Error(`Definizione incompleta per lo slot ${slot.slot}`);
    }
    return {
      slot: slot.slot,
      sourceA,
      sourceB,
      destination,
      depth,
      rationale: "Slot inattivo con valori predefiniti ufficiali.",
    };
  });
}

export function completeMatrixSlots(
  assignments: readonly MatrixAssignment[],
  kind: "mod" | "fx",
): MatrixAssignment[] {
  const defaults = matrixDefaults(kind === "mod" ? modulationCatalog : fxModulationCatalog);
  const assigned = new Map(assignments.map((assignment) => [assignment.slot, assignment]));
  return defaults.map((fallback) => assigned.get(fallback.slot) ?? fallback);
}
