import parameterCatalogJson from "../data/summit-parameter-catalog.json";
import modulationCatalogJson from "../data/summit-modulation-catalog.json";
import fxModulationCatalogJson from "../data/summit-fx-modulation-catalog.json";
import catalogTargetJson from "../data/summit-catalog-target.json";
import { z } from "zod";
import {
  summitCatalogTargetSchema,
  summitParameterCatalogSchema,
  verificationStatusSchema,
  type SummitParameterDefinition,
  type SummitPatchProposal,
} from "./schemas";

export const parameterCatalog = summitParameterCatalogSchema.parse(parameterCatalogJson);
export const parameterById = new Map(
  parameterCatalog.map((parameter) => [parameter.id, parameter]),
);
export const catalogTarget = summitCatalogTargetSchema.parse(catalogTargetJson);

type FirmwareApplicable = {
  introducedInFirmware?: string | undefined;
  removedInFirmware?: string | undefined;
};

const modulationEntitySchema = z
  .object({
    id: z.string().min(1),
    displayLabel: z.string().min(1),
    verificationStatus: verificationStatusSchema,
    aiExposed: z.boolean(),
    introducedInFirmware: z.string().optional(),
    removedInFirmware: z.string().optional(),
  })
  .passthrough();

const modulationCatalogSchema = z
  .object({
    slots: z.number().int().positive(),
    sources: z.array(modulationEntitySchema),
    destinations: z.array(modulationEntitySchema),
  })
  .passthrough();

const modulationCatalog = modulationCatalogSchema.parse(modulationCatalogJson);
const fxModulationCatalog = modulationCatalogSchema.parse(fxModulationCatalogJson);

export function compareFirmwareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const partCount = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < partCount; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function isFirmwareApplicable(item: FirmwareApplicable, targetFirmware: string): boolean {
  if (
    item.introducedInFirmware &&
    compareFirmwareVersions(targetFirmware, item.introducedInFirmware) < 0
  ) {
    return false;
  }
  if (
    item.removedInFirmware &&
    compareFirmwareVersions(targetFirmware, item.removedInFirmware) >= 0
  ) {
    return false;
  }
  return true;
}

export function isParameterAiUsable(
  parameter: SummitParameterDefinition,
  targetFirmware = catalogTarget.primaryFirmware,
): boolean {
  return (
    parameter.verificationStatus === "verified" &&
    parameter.aiExposed &&
    isFirmwareApplicable(parameter, targetFirmware)
  );
}

export function getAiParameterCatalog(
  targetFirmware = catalogTarget.primaryFirmware,
  scopes: ReadonlySet<SummitParameterDefinition["scope"]> = new Set(["part"]),
) {
  return parameterCatalog.filter(
    (parameter) => scopes.has(parameter.scope) && isParameterAiUsable(parameter, targetFirmware),
  );
}

export const aiParameterCatalog = getAiParameterCatalog();

function applicableLocations(parameter: SummitParameterDefinition, targetFirmware: string) {
  return [parameter.location, ...(parameter.alternateLocations ?? [])].filter((location) =>
    isFirmwareApplicable(location, targetFirmware),
  );
}

function verifiedEntityIds(
  entities: z.infer<typeof modulationEntitySchema>[],
  targetFirmware: string,
) {
  return new Set(
    entities
      .filter(
        (entity) =>
          entity.verificationStatus === "verified" &&
          entity.aiExposed &&
          isFirmwareApplicable(entity, targetFirmware),
      )
      .map((entity) => entity.id),
  );
}

export type ProposalValidationIssue = { path: string; message: string };

function validateValue(
  parameterId: string,
  value: string | number | boolean,
  targetFirmware: string,
  expectedScope: "part" | "multi",
): string | undefined {
  const definition = parameterById.get(parameterId);
  if (!definition) return "Parametro non presente nel catalogo verificato";
  if (definition.scope !== expectedScope) {
    return definition.scope === "global"
      ? "Parametro globale non inseribile in una patch"
      : definition.scope === "multi"
        ? "Parametro Multi non inseribile nelle impostazioni di una singola Parte"
        : "Parametro di Parte non inseribile nel setup Multi";
  }
  if (!isFirmwareApplicable(definition, targetFirmware)) {
    return `Parametro non disponibile nel firmware ${targetFirmware}`;
  }
  if (!isParameterAiUsable(definition, targetFirmware)) {
    return "Parametro non verificato o non esposto al provider AI";
  }
  if (typeof value === "number") {
    if (definition.minimum !== undefined && value < definition.minimum) {
      return `Valore ${value} inferiore al minimo ${definition.minimum}`;
    }
    if (definition.maximum !== undefined && value > definition.maximum) {
      return `Valore ${value} superiore al massimo ${definition.maximum}`;
    }
  }
  if (definition.enumValues && !definition.enumValues.includes(String(value))) {
    return `Valore ${String(value)} non compreso nell'enumerazione verificata`;
  }
  if (definition.aiEnumValues && !definition.aiEnumValues.includes(String(value))) {
    return `Valore ${String(value)} non stabile per l'uso AI`;
  }
  if (definition.aiStableEnumValueCount !== undefined) {
    const valueIndex = definition.enumValues?.indexOf(String(value)) ?? -1;
    if (valueIndex >= definition.aiStableEnumValueCount) {
      return `Valore ${String(value)} configurabile dall'utente e non stabile per l'uso AI`;
    }
  }
  const enumFirmware = definition.enumValueFirmware?.[String(value)];
  if (enumFirmware && !isFirmwareApplicable(enumFirmware, targetFirmware)) {
    return `Valore ${String(value)} non disponibile nel firmware ${targetFirmware}`;
  }
  return undefined;
}

export function validateProposalAgainstCatalog(
  proposal: SummitPatchProposal,
  targetFirmware = proposal.targetFirmware ?? catalogTarget.primaryFirmware,
): ProposalValidationIssue[] {
  const issues: ProposalValidationIssue[] = [];
  const mainSources = verifiedEntityIds(modulationCatalog.sources, targetFirmware);
  const mainDestinations = verifiedEntityIds(modulationCatalog.destinations, targetFirmware);
  const fxSources = verifiedEntityIds(fxModulationCatalog.sources, targetFirmware);
  const fxDestinations = verifiedEntityIds(fxModulationCatalog.destinations, targetFirmware);
  for (const part of proposal.parts) {
    for (const [index, setting] of part.panelControls.entries()) {
      const definition = parameterById.get(setting.parameterId);
      const locations = definition ? applicableLocations(definition, targetFirmware) : [];
      if (!locations.some((location) => location.type === "panel")) {
        issues.push({
          path: `parts.${part.part}.panelControls.${index}`,
          message: definition
            ? "Parametro menu inserito tra i controlli pannello"
            : "Parametro inventato",
        });
      }
      const message = validateValue(setting.parameterId, setting.value, targetFirmware, "part");
      if (message) issues.push({ path: setting.parameterId, message });
    }
    for (const [index, setting] of part.menuSettings.entries()) {
      const definition = parameterById.get(setting.parameterId);
      const locations = definition ? applicableLocations(definition, targetFirmware) : [];
      const matchingMenu = locations.find(
        (location) =>
          location.type === "menu" &&
          location.menu.toLowerCase() === setting.menu.toLowerCase() &&
          location.page === setting.page,
      );
      if (!matchingMenu) {
        issues.push({
          path: `parts.${part.part}.menuSettings.${index}`,
          message: definition
            ? "Menu o pagina non corrispondono al catalogo verificato"
            : "Parametro inventato",
        });
      }
      const message = validateValue(setting.parameterId, setting.value, targetFirmware, "part");
      if (message) issues.push({ path: setting.parameterId, message });
    }
    for (const assignment of part.modulationMatrix) {
      if (assignment.slot > modulationCatalog.slots) {
        issues.push({ path: `mod.${assignment.slot}`, message: "Slot Mod Matrix oltre il limite" });
      }
      if (!mainSources.has(assignment.sourceA)) {
        issues.push({ path: `mod.${assignment.slot}.sourceA`, message: "Sorgente non verificata" });
      }
      if (assignment.sourceB && !mainSources.has(assignment.sourceB)) {
        issues.push({ path: `mod.${assignment.slot}.sourceB`, message: "Sorgente non verificata" });
      }
      if (!mainDestinations.has(assignment.destination)) {
        issues.push({
          path: `mod.${assignment.slot}.destination`,
          message: "Destinazione non verificata",
        });
      }
    }
    for (const assignment of part.fxModulationMatrix) {
      if (assignment.slot > fxModulationCatalog.slots) {
        issues.push({ path: `fxMod.${assignment.slot}`, message: "Slot FX Mod oltre il limite" });
      }
      if (!fxSources.has(assignment.sourceA)) {
        issues.push({
          path: `fxMod.${assignment.slot}.sourceA`,
          message: "Sorgente non verificata",
        });
      }
      if (assignment.sourceB && !fxSources.has(assignment.sourceB)) {
        issues.push({
          path: `fxMod.${assignment.slot}.sourceB`,
          message: "Sorgente non verificata",
        });
      }
      if (!fxDestinations.has(assignment.destination)) {
        issues.push({
          path: `fxMod.${assignment.slot}.destination`,
          message: "Destinazione non verificata",
        });
      }
    }
  }
  if (proposal.multiSetup) {
    for (const [index, setting] of proposal.multiSetup.panelControls.entries()) {
      const definition = parameterById.get(setting.parameterId);
      const locations = definition ? applicableLocations(definition, targetFirmware) : [];
      if (!locations.some((location) => location.type === "panel")) {
        issues.push({
          path: `multiSetup.panelControls.${index}`,
          message: definition
            ? "Parametro menu inserito tra i controlli pannello Multi"
            : "Parametro inventato",
        });
      }
      const message = validateValue(setting.parameterId, setting.value, targetFirmware, "multi");
      if (message) issues.push({ path: setting.parameterId, message });
    }
    for (const [index, setting] of proposal.multiSetup.menuSettings.entries()) {
      const definition = parameterById.get(setting.parameterId);
      const locations = definition ? applicableLocations(definition, targetFirmware) : [];
      const matchingMenu = locations.find(
        (location) =>
          location.type === "menu" &&
          location.menu.toLowerCase() === setting.menu.toLowerCase() &&
          location.page === setting.page,
      );
      if (!matchingMenu) {
        issues.push({
          path: `multiSetup.menuSettings.${index}`,
          message: definition
            ? "Menu o pagina non corrispondono al catalogo Multi verificato"
            : "Parametro inventato",
        });
      }
      const message = validateValue(setting.parameterId, setting.value, targetFirmware, "multi");
      if (message) issues.push({ path: setting.parameterId, message });
    }
  }
  return issues;
}
