import {
  catalogTarget,
  fxModulationCatalog,
  getAiParameterCatalog,
  isFirmwareApplicable,
  modulationCatalog,
} from "../domain/catalog";
import { buildDefaultPartSettings } from "../domain/patchUi";
import type { SummitPatchProposal } from "../domain/schemas";

type CompactLocation = {
  type: "panel" | "menu";
  menu?: string;
  page?: number | string;
};

type CompactParameter = {
  id: string;
  label: string;
  section: string;
  valueType: string;
  minimum?: number;
  maximum?: number;
  step?: number;
  enumValues?: string[];
  defaultValue: string | number | boolean;
  location: CompactLocation;
  sonicEffect: string;
};

function compactEntities(
  entities: Array<{
    id: string;
    displayLabel: string;
    verificationStatus: string;
    aiExposed: boolean;
    introducedInFirmware?: string | undefined;
    removedInFirmware?: string | undefined;
  }>,
  targetFirmware: string,
) {
  return entities
    .filter(
      (entity) =>
        entity.verificationStatus === "verified" &&
        entity.aiExposed &&
        isFirmwareApplicable(entity, targetFirmware),
    )
    .map((entity) => ({ id: entity.id, label: entity.displayLabel }));
}

function compactParameter(
  definition: ReturnType<typeof getAiParameterCatalog>[number],
): CompactParameter | undefined {
  const defaultValue = definition.defaultValue;
  if (
    typeof defaultValue !== "string" &&
    typeof defaultValue !== "number" &&
    typeof defaultValue !== "boolean"
  ) {
    return undefined;
  }
  return {
    id: definition.id,
    label: definition.label,
    section: definition.section,
    valueType: definition.valueType,
    ...(definition.minimum === undefined ? {} : { minimum: definition.minimum }),
    ...(definition.maximum === undefined ? {} : { maximum: definition.maximum }),
    ...(definition.step === undefined ? {} : { step: definition.step }),
    ...((definition.aiEnumValues ?? definition.enumValues)
      ? { enumValues: [...(definition.aiEnumValues ?? definition.enumValues ?? [])] }
      : {}),
    defaultValue,
    location:
      definition.location.type === "panel"
        ? { type: "panel" }
        : {
            type: "menu",
            menu: definition.location.menu,
            page: definition.location.page,
          },
    sonicEffect: definition.sonicEffect,
  };
}

function compactMatrix(catalog: typeof modulationCatalog, targetFirmware: string) {
  return {
    slots: catalog.slots,
    depthMinimum: catalog.depthRange[0],
    depthMaximum: catalog.depthRange[1],
    sources: compactEntities(catalog.sources, targetFirmware),
    destinations: compactEntities(catalog.destinations, targetFirmware),
  };
}

export function buildAiCatalogContext(targetFirmware = catalogTarget.primaryFirmware) {
  return {
    parameters: getAiParameterCatalog(targetFirmware, new Set(["part"]))
      .map(compactParameter)
      .filter((parameter): parameter is CompactParameter => parameter !== undefined),
    modulation: compactMatrix(modulationCatalog, targetFirmware),
    fxModulation: compactMatrix(fxModulationCatalog, targetFirmware),
  };
}

export function buildCurrentPatchSummary(
  proposal: SummitPatchProposal,
  targetFirmware = proposal.targetFirmware ?? catalogTarget.primaryFirmware,
) {
  const defaults = buildDefaultPartSettings(targetFirmware);
  const defaultValues = new Map(
    [...defaults.panelControls, ...defaults.menuSettings].map((setting) => [
      setting.parameterId,
      setting.value,
    ]),
  );
  const part = proposal.parts.find((candidate) => candidate.part === "A") ?? proposal.parts[0];
  const settings =
    part?.panelControls
      .concat(part.menuSettings)
      .filter((setting) => defaultValues.get(setting.parameterId) !== setting.value)
      .map((setting) => ({
        parameterId: setting.parameterId,
        value: setting.value,
      })) ?? [];
  const activeMatrixSlots = (
    assignments: SummitPatchProposal["parts"][number]["modulationMatrix"],
  ) =>
    assignments
      .filter((assignment) => assignment.depth !== 0)
      .map(({ slot, sourceA, sourceB, destination, depth }) => ({
        slot,
        sourceA,
        sourceB: sourceB ?? "direct",
        destination,
        depth,
      }));
  return {
    patchName: proposal.patch.name,
    category: proposal.patch.category,
    description: proposal.patch.description,
    settings,
    modulationSlots: part ? activeMatrixSlots(part.modulationMatrix) : [],
    fxModulationSlots: part ? activeMatrixSlots(part.fxModulationMatrix) : [],
  };
}
