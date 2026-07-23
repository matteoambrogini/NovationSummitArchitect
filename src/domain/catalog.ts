import parameterCatalogJson from "../data/summit-parameter-catalog.json";
import modulationCatalogJson from "../data/summit-modulation-catalog.json";
import fxModulationCatalogJson from "../data/summit-fx-modulation-catalog.json";
import { summitParameterCatalogSchema, type SummitPatchProposal } from "./schemas";

export const parameterCatalog = summitParameterCatalogSchema.parse(parameterCatalogJson);
export const parameterById = new Map(parameterCatalog.map((parameter) => [parameter.id, parameter]));

const modulationCatalog = modulationCatalogJson as {
  sources: Array<{ id: string; displayLabel: string }>;
  destinations: Array<{ id: string; displayLabel: string }>;
};
const fxModulationCatalog = fxModulationCatalogJson as {
  sources: Array<{ id: string; displayLabel: string }>;
  destinations: Array<{ id: string; displayLabel: string }>;
};

const mainSources = new Set(modulationCatalog.sources.map((source) => source.id));
const mainDestinations = new Set(modulationCatalog.destinations.map((destination) => destination.id));
const fxSources = new Set(fxModulationCatalog.sources.map((source) => source.id));
const fxDestinations = new Set(
  fxModulationCatalog.destinations.map((destination) => destination.id),
);

export type ProposalValidationIssue = { path: string; message: string };

function validateValue(parameterId: string, value: string | number | boolean): string | undefined {
  const definition = parameterById.get(parameterId);
  if (!definition) return "Parametro non presente nel catalogo verificato";
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
  return undefined;
}

export function validateProposalAgainstCatalog(
  proposal: SummitPatchProposal,
): ProposalValidationIssue[] {
  const issues: ProposalValidationIssue[] = [];
  for (const part of proposal.parts) {
    for (const [index, setting] of part.panelControls.entries()) {
      const definition = parameterById.get(setting.parameterId);
      if (definition?.location.type !== "panel") {
        issues.push({
          path: `parts.${part.part}.panelControls.${index}`,
          message: definition ? "Parametro menu inserito tra i controlli pannello" : "Parametro inventato",
        });
      }
      const message = validateValue(setting.parameterId, setting.value);
      if (message) issues.push({ path: setting.parameterId, message });
    }
    for (const [index, setting] of part.menuSettings.entries()) {
      const definition = parameterById.get(setting.parameterId);
      if (definition?.location.type !== "menu") {
        issues.push({
          path: `parts.${part.part}.menuSettings.${index}`,
          message: definition ? "Parametro pannello inserito nei menu" : "Parametro inventato",
        });
      }
      const message = validateValue(setting.parameterId, setting.value);
      if (message) issues.push({ path: setting.parameterId, message });
    }
    for (const assignment of part.modulationMatrix) {
      if (!mainSources.has(assignment.sourceA)) {
        issues.push({ path: `mod.${assignment.slot}.sourceA`, message: "Sorgente non verificata" });
      }
      if (assignment.sourceB && !mainSources.has(assignment.sourceB)) {
        issues.push({ path: `mod.${assignment.slot}.sourceB`, message: "Sorgente non verificata" });
      }
      if (!mainDestinations.has(assignment.destination)) {
        issues.push({ path: `mod.${assignment.slot}.destination`, message: "Destinazione non verificata" });
      }
    }
    for (const assignment of part.fxModulationMatrix) {
      if (!fxSources.has(assignment.sourceA)) {
        issues.push({ path: `fxMod.${assignment.slot}.sourceA`, message: "Sorgente non verificata" });
      }
      if (assignment.sourceB && !fxSources.has(assignment.sourceB)) {
        issues.push({ path: `fxMod.${assignment.slot}.sourceB`, message: "Sorgente non verificata" });
      }
      if (!fxDestinations.has(assignment.destination)) {
        issues.push({ path: `fxMod.${assignment.slot}.destination`, message: "Destinazione non verificata" });
      }
    }
  }
  return issues;
}
