import {
  catalogTarget,
  fxModulationCatalog,
  isFirmwareApplicable,
  isParameterAiUsable,
  modulationCatalog,
  parameterById,
  validateProposalAgainstCatalog,
  validateUiParameterValue,
} from "../domain/catalog";
import {
  buildDefaultPartSettings,
  completeMatrixSlots,
  formatParameterValue,
  type MatrixAssignment,
  type ParameterValue,
} from "../domain/patchUi";
import { summitPatchProposalSchema, type SummitPatchProposal } from "../domain/schemas";
import { aiGenerationSchema, type AiGeneration } from "./contract";

export const SUMMIT_INIT_PATCH_VERSION = "1.0.0" as const;

export class GenerationValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("La proposta AI non supera la validazione locale.");
    this.name = "GenerationValidationError";
    this.issues = issues;
  }
}

export type AssembledGeneration = {
  proposal: SummitPatchProposal;
  generation: AiGeneration;
  warnings: string[];
  partial: boolean;
};

type AssembleOptions = {
  description: string;
  targetFirmware?: string;
  baseProposal?: SummitPatchProposal;
  allowPartial?: boolean;
};

function uniqueIssues(issues: string[]) {
  return [...new Set(issues)].slice(0, 50);
}

function parseGeneration(candidate: unknown): AiGeneration {
  const parsed = aiGenerationSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  throw new GenerationValidationError(
    parsed.error.issues.map((issue) => `${issue.path.join(".") || "generation"}: ${issue.message}`),
  );
}

function isValueAiUsable(
  parameterId: string,
  value: ParameterValue,
  targetFirmware: string,
): string | undefined {
  const definition = parameterById.get(parameterId);
  if (!definition || definition.scope !== "part") {
    return "parametro assente o fuori dallo scope Part";
  }
  if (!isParameterAiUsable(definition, targetFirmware)) {
    return "parametro non verificato o non esposto al provider AI";
  }
  const uiIssue = validateUiParameterValue(parameterId, value, targetFirmware);
  if (uiIssue) return uiIssue;
  if (definition.aiEnumValues && !definition.aiEnumValues.includes(String(value))) {
    return "valore enum non stabile per l'uso AI";
  }
  if (definition.aiStableEnumValueCount !== undefined) {
    const valueIndex = definition.enumValues?.indexOf(String(value)) ?? -1;
    if (valueIndex < 0 || valueIndex >= definition.aiStableEnumValueCount) {
      return "valore enum oltre la porzione verificata per l'uso AI";
    }
  }
  return undefined;
}

function verifiedEntityIds(
  entities: Array<{
    id: string;
    verificationStatus: string;
    aiExposed: boolean;
    introducedInFirmware?: string | undefined;
    removedInFirmware?: string | undefined;
  }>,
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

function validateMatrixAssignment(
  assignment: MatrixAssignment,
  kind: "mod" | "fx",
  targetFirmware: string,
): string | undefined {
  const catalog = kind === "mod" ? modulationCatalog : fxModulationCatalog;
  const sources = verifiedEntityIds(catalog.sources, targetFirmware);
  const destinations = verifiedEntityIds(catalog.destinations, targetFirmware);
  if (assignment.slot < 1 || assignment.slot > catalog.slots) return "slot fuori range";
  if (!sources.has(assignment.sourceA)) return "sourceA non verificata";
  if (assignment.sourceB && !sources.has(assignment.sourceB)) {
    return "sourceB non verificata";
  }
  if (!destinations.has(assignment.destination)) return "destinazione non verificata";
  if (
    !Number.isInteger(assignment.depth) ||
    assignment.depth < catalog.depthRange[0] ||
    assignment.depth > catalog.depthRange[1]
  ) {
    return "depth fuori range";
  }
  return undefined;
}

function baseProposal(
  description: string,
  targetFirmware: string,
  existing?: SummitPatchProposal,
): SummitPatchProposal {
  if (existing) return structuredClone(existing);
  const settings = buildDefaultPartSettings(targetFirmware);
  return summitPatchProposalSchema.parse({
    schemaVersion: "1.0.0",
    proposalId: `ai-init-${SUMMIT_INIT_PATCH_VERSION}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    targetFirmware,
    patch: {
      name: "Init Patch",
      mode: "single",
      category: "other",
      description: "Init Patch deterministica costruita dai default verificati.",
      targetSound: description,
    },
    analysis: {
      soundRole: "init",
      synthesisHypothesis: "Patch iniziale sicura basata sui default verificati.",
      oscillatorStrategy: "Default verificati.",
      filterStrategy: "Default verificati.",
      envelopeStrategy: "Default verificati.",
      modulationStrategy: "Nessuna modulazione attiva.",
      effectsStrategy: "Default verificati.",
      overallConfidence: 1,
      assumptions: ["Firmware target verificato."],
      uncertainties: [],
    },
    parts: [
      {
        part: "A",
        ...settings,
        modulationMatrix: completeMatrixSlots([], "mod"),
        fxModulationMatrix: completeMatrixSlots([], "fx"),
      },
    ],
    setupInstructions: [],
    auditionGuide: {
      recommendedNotes: ["C2", "C3", "C4"],
      recommendedPlayingStyle: "Note singole a volume moderato.",
      whatToListenFor: ["Livello", "attacco", "brillantezza", "coda degli effetti"],
    },
    refinements: [],
    alternatives: [],
  });
}

function sectionReason(generation: AiGeneration, section: string) {
  return (
    generation.sectionConfidence.find((candidate) => candidate.section === section)?.reason ??
    generation.summary
  );
}

function confidenceAverage(generation: AiGeneration) {
  const values = [
    ...generation.settings.map((setting) => setting.confidence),
    ...generation.modulationSlots.map((slot) => slot.confidence),
    ...generation.fxModulationSlots.map((slot) => slot.confidence),
    ...generation.sectionConfidence.map((section) => section.confidence),
  ];
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0.5;
}

export function assembleSummitPatch(
  candidate: unknown,
  options: AssembleOptions,
): AssembledGeneration {
  const generation = parseGeneration(candidate);
  const targetFirmware = options.targetFirmware ?? catalogTarget.primaryFirmware;
  const proposal = baseProposal(options.description, targetFirmware, options.baseProposal);
  const validationIssues: string[] = [];
  const fallbackWarnings: string[] = [];
  const seenParameterIds = new Set<string>();
  const appliedParameterIds = new Set<string>();
  const part =
    proposal.parts.find((candidatePart) => candidatePart.part === "A") ?? proposal.parts[0];
  if (!part) throw new GenerationValidationError(["La patch base non contiene la Parte A."]);

  for (const setting of generation.settings) {
    const duplicate = seenParameterIds.has(setting.parameterId);
    const issue =
      (duplicate ? "parametro duplicato" : undefined) ??
      isValueAiUsable(setting.parameterId, setting.value, targetFirmware);
    if (issue) {
      const message = `settings.${setting.parameterId}: ${issue}`;
      validationIssues.push(message);
      fallbackWarnings.push(`Ignorato ${setting.parameterId}: ${issue}.`);
      continue;
    }
    seenParameterIds.add(setting.parameterId);
    const definition = parameterById.get(setting.parameterId);
    if (!definition) continue;
    const collections = [part.panelControls, part.menuSettings];
    const existing = collections
      .flat()
      .find((candidateSetting) => candidateSetting.parameterId === setting.parameterId);
    if (!existing) {
      validationIssues.push(`settings.${setting.parameterId}: assente dalla patch base`);
      fallbackWarnings.push(`Ignorato ${setting.parameterId}: assente dalla patch base.`);
      continue;
    }
    existing.value = setting.value;
    existing.displayValue = formatParameterValue(definition, setting.value);
    existing.confidence = setting.confidence;
    existing.rationale = setting.rationale;
    appliedParameterIds.add(setting.parameterId);
  }

  const applyMatrix = (
    assignments: AiGeneration["modulationSlots"],
    kind: "mod" | "fx",
  ): MatrixAssignment[] => {
    const seenSlots = new Set<number>();
    const valid: MatrixAssignment[] = [];
    for (const assignment of assignments) {
      const matrixAssignment: MatrixAssignment = {
        slot: assignment.slot,
        sourceA: assignment.sourceA,
        sourceB: assignment.sourceB,
        destination: assignment.destination,
        depth: assignment.depth,
        rationale: assignment.rationale,
      };
      const issue =
        (seenSlots.has(assignment.slot) ? "slot duplicato" : undefined) ??
        validateMatrixAssignment(matrixAssignment, kind, targetFirmware);
      if (issue) {
        validationIssues.push(`${kind}.${assignment.slot}: ${issue}`);
        fallbackWarnings.push(`Ignorato slot ${kind.toUpperCase()} ${assignment.slot}: ${issue}.`);
        continue;
      }
      seenSlots.add(assignment.slot);
      valid.push(matrixAssignment);
    }
    return completeMatrixSlots(valid, kind);
  };

  part.modulationMatrix = applyMatrix(generation.modulationSlots, "mod");
  part.fxModulationMatrix = applyMatrix(generation.fxModulationSlots, "fx");

  if (validationIssues.length > 0 && !options.allowPartial) {
    throw new GenerationValidationError(uniqueIssues(validationIssues));
  }

  proposal.proposalId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  proposal.createdAt = new Date().toISOString();
  proposal.targetFirmware = targetFirmware;
  proposal.patch.name = generation.patchName;
  proposal.patch.category = generation.category;
  proposal.patch.description = generation.description;
  proposal.patch.targetSound = options.description;
  proposal.analysis = {
    soundRole: generation.soundAnalysis.role,
    synthesisHypothesis: generation.summary,
    oscillatorStrategy: sectionReason(generation, "oscillators"),
    filterStrategy: sectionReason(generation, "filter"),
    envelopeStrategy: sectionReason(generation, "envelopes"),
    modulationStrategy: sectionReason(generation, "modulation"),
    effectsStrategy: sectionReason(generation, "effects"),
    overallConfidence: confidenceAverage(generation),
    assumptions: generation.assumptions,
    uncertainties: [...generation.warnings, ...fallbackWarnings],
  };
  proposal.setupInstructions = generation.settings
    .filter((setting) => appliedParameterIds.has(setting.parameterId))
    .map((setting, index) => {
      const definition = parameterById.get(setting.parameterId);
      const applied = [...part.panelControls, ...part.menuSettings].find(
        (candidateSetting) => candidateSetting.parameterId === setting.parameterId,
      );
      return {
        order: index + 1,
        area: definition?.section ?? "Patch",
        instruction: `${definition?.label ?? setting.parameterId} → ${applied?.displayValue ?? String(setting.value)}.`,
        parameterIds: [setting.parameterId],
      };
    });
  proposal.auditionGuide = {
    recommendedNotes: generation.category === "bass" ? ["C1", "G1", "C2"] : ["C3", "E3", "G3"],
    recommendedVelocity: "Prova dinamiche basse, medie e alte.",
    recommendedPlayingStyle: "Adatta articolazione e durata al ruolo descritto.",
    whatToListenFor: [
      generation.soundAnalysis.transientCharacter,
      generation.soundAnalysis.harmonicCharacter,
      generation.soundAnalysis.spatialCharacter,
    ],
  };
  proposal.refinements = [];
  proposal.alternatives = [];

  const parsedProposal = summitPatchProposalSchema.parse(proposal);
  const catalogIssues = validateProposalAgainstCatalog(parsedProposal, targetFirmware);
  if (catalogIssues.length > 0) {
    throw new GenerationValidationError(
      uniqueIssues(catalogIssues.map((issue) => `${issue.path}: ${issue.message}`)),
    );
  }
  return {
    proposal: parsedProposal,
    generation,
    warnings: [...generation.warnings, ...fallbackWarnings],
    partial: validationIssues.length > 0,
  };
}

export function safeInitPatch(
  description: string,
  targetFirmware = catalogTarget.primaryFirmware,
  existing?: SummitPatchProposal,
) {
  const proposal = baseProposal(description, targetFirmware, existing);
  proposal.proposalId = `ai-safe-${SUMMIT_INIT_PATCH_VERSION}-${Date.now()}`;
  proposal.createdAt = new Date().toISOString();
  proposal.patch.targetSound = description;
  return summitPatchProposalSchema.parse(proposal);
}
