import { create } from "zustand";
import { buildDemoProposal, demoConfigs } from "../ai/demoPatches";
import { OpenAiPatchProvider } from "../ai/openAiProvider";
import type { AnalysisMode, GenerationInsight } from "../ai/provider";
import {
  displayAreaById,
  fxModulationCatalog,
  modulationCatalog,
  parameterById,
  validateProposalAgainstCatalog,
  validateUiParameterValue,
} from "../domain/catalog";
import {
  boundedDisplayPage,
  buildPatchSetupChecklist,
  firstMappedDisplayField,
  getDisplaySelection,
  getMatrixAssignment,
  isMatrixDisplayAreaId,
  type MatrixDisplayAreaId,
  type MatrixDisplayFieldId,
  type MatrixDisplayValue,
  type SetupFilter,
} from "../domain/displayStructure";
import {
  buildDefaultMultiSettings,
  getScopePart,
  type ParameterValue,
  type PatchScope,
} from "../domain/patchUi";
import {
  summitPatchProposalSchema,
  summitProjectFileSchema,
  type SummitPatchProposal,
  type SummitProjectFile,
} from "../domain/schemas";
import { parseReferenceUrl, parseTimestamp } from "../services/reference";

type GenerationStatus = "idle" | "analysing" | "validating" | "ready" | "error";

type SoundInput = {
  description: string;
  referenceUrl: string;
  timestamp: string;
  targetSound: string;
  audioFileName?: string;
  analysisMode: AnalysisMode;
};

type AppState = {
  input: SoundInput;
  proposals: SummitPatchProposal[];
  generationInsights: Array<GenerationInsight | null>;
  activeIndex: number;
  generationStatus: GenerationStatus;
  statusMessage: string;
  selectedParameterId: string | undefined;
  activeScope: PatchScope;
  activeDisplayAreaId: string;
  activeDisplayPage: number;
  selectedDisplayFieldId: string | undefined;
  activeModulationSlot: number;
  activeFxModulationSlot: number;
  activeGlobalLfo: 3 | 4;
  activeModEnvelope: 1 | 2;
  setupMode: boolean;
  setupStep: number;
  setupOnlyModified: boolean;
  setupFilter: SetupFilter;
  updateInput: (input: Partial<SoundInput>) => void;
  setAudioFileName: (name?: string) => void;
  generate: () => Promise<void>;
  loadDemo: (demoId: string) => void;
  refine: (instruction: string) => Promise<void>;
  setParameterValue: (parameterId: string, value: ParameterValue) => void;
  selectParameter: (parameterId?: string) => void;
  selectDisplayArea: (areaId: string) => void;
  setDisplayPage: (page: number) => void;
  stepDisplayPage: (direction: -1 | 1) => void;
  selectDisplayField: (fieldId: string) => void;
  setDisplaySlot: (areaId: MatrixDisplayAreaId, slot: number) => void;
  stepDisplaySlot: (direction: -1 | 1) => void;
  setMatrixFieldValue: (
    areaId: MatrixDisplayAreaId,
    slot: number,
    fieldId: MatrixDisplayFieldId,
    value: MatrixDisplayValue,
  ) => void;
  setActiveGlobalLfo: (lfo: 3 | 4) => void;
  setActiveModEnvelope: (envelope: 1 | 2) => void;
  setActiveScope: (scope: PatchScope) => void;
  toggleSetupMode: () => void;
  nextSetupStep: () => void;
  previousSetupStep: () => void;
  skipSetupStep: () => void;
  toggleSetupOnlyModified: () => void;
  setSetupFilter: (filter: SetupFilter) => void;
  undo: () => void;
  redo: () => void;
  loadProject: (project: SummitProjectFile) => void;
  toProject: () => SummitProjectFile;
};

const provider = new OpenAiPatchProvider();

const initialInput: SoundInput = {
  description:
    "Un pluck progressive-house brillante con transiente netto, decay corto e immagine stereo ampia.",
  referenceUrl: "",
  timestamp: "",
  targetSound: "",
  analysisMode: "text",
};

function displayStateForParameter(parameterId?: string) {
  const location = getDisplaySelection(parameterId);
  if (!location) {
    return {
      selectedParameterId: parameterId,
    };
  }
  return {
    selectedParameterId: parameterId,
    activeDisplayAreaId: location.area.id,
    activeDisplayPage: location.page.page,
    selectedDisplayFieldId: location.field?.id,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  input: initialInput,
  proposals: [],
  generationInsights: [],
  activeIndex: -1,
  generationStatus: "idle",
  statusMessage: "OpenAI pronto nell'app desktop. La credenziale resta nel backend.",
  selectedParameterId: undefined,
  activeScope: "single",
  activeDisplayAreaId: "osc",
  activeDisplayPage: 1,
  selectedDisplayFieldId: "diverge",
  activeModulationSlot: 1,
  activeFxModulationSlot: 1,
  activeGlobalLfo: 3,
  activeModEnvelope: 1,
  setupMode: false,
  setupStep: 0,
  setupOnlyModified: true,
  setupFilter: "all",
  updateInput: (next) =>
    set((state) => ({
      input: { ...state.input, ...next },
    })),
  setAudioFileName: (name) =>
    set((state) => {
      const input = {
        ...state.input,
        analysisMode: name
          ? ("audio-assisted" as const)
          : state.input.referenceUrl
            ? ("reference" as const)
            : ("text" as const),
      };
      if (name) input.audioFileName = name;
      else delete input.audioFileName;
      return { input };
    }),
  generate: async () => {
    const { input } = get();
    if (input.description.trim().length < 3) {
      set({
        generationStatus: "error",
        statusMessage: "Descrivi il suono con almeno tre caratteri.",
      });
      return;
    }
    try {
      set({ generationStatus: "analysing", statusMessage: "Analisi dell'intento sonoro…" });
      set({
        generationStatus: "validating",
        statusMessage: "Generazione OpenAI e validazione contro il catalogo Summit…",
      });
      const result = await provider.generate({
        description: input.description,
        mode: "text",
      });
      const issues = validateProposalAgainstCatalog(result.proposal);
      if (issues.length) throw new Error(`Proposta rifiutata: ${issues[0]?.message}`);
      const state = get();
      const proposals = state.proposals.slice(0, state.activeIndex + 1);
      const generationInsights = state.generationInsights.slice(0, state.activeIndex + 1);
      proposals.push(result.proposal);
      generationInsights.push(result.insight);
      set({
        proposals,
        generationInsights,
        activeIndex: proposals.length - 1,
        generationStatus: "ready",
        statusMessage: result.insight.partial
          ? "Patch sicura applicata parzialmente: controlla gli avvisi."
          : result.insight.repaired
            ? "Patch OpenAI riparata e validata localmente."
            : "Patch OpenAI validata e applicata al pannello.",
        ...displayStateForParameter(result.proposal.parts[0]?.panelControls[0]?.parameterId),
        activeScope: "single",
        setupStep: 0,
      });
    } catch (error) {
      set({
        generationStatus: "error",
        statusMessage: error instanceof Error ? error.message : "Generazione non riuscita",
      });
    }
  },
  loadDemo: (demoId) => {
    const demo = demoConfigs.find((candidate) => candidate.id === demoId);
    if (!demo) throw new Error(`Demo sconosciuta: ${demoId}`);
    const proposal = buildDemoProposal(demo);
    const issues = validateProposalAgainstCatalog(proposal);
    if (issues.length) throw new Error(issues[0]?.message ?? "Demo non valida");
    set({
      proposals: [proposal],
      generationInsights: [null],
      activeIndex: 0,
      activeScope: "single",
      generationStatus: "ready",
      statusMessage: `${demo.displayName} aperta dal catalogo demo.`,
      ...displayStateForParameter("filter.frequency"),
      setupMode: false,
      setupStep: 0,
    });
  },
  refine: async (instruction) => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) throw new Error("Genera prima una proposta");
    set({ generationStatus: "analysing", statusMessage: "Calcolo del delta…" });
    try {
      const result = await provider.refine(active, instruction);
      const issues = validateProposalAgainstCatalog(result.proposal);
      if (issues.length) throw new Error(`Proposta rifiutata: ${issues[0]?.message}`);
      const proposals = state.proposals.slice(0, state.activeIndex + 1);
      const generationInsights = state.generationInsights.slice(0, state.activeIndex + 1);
      proposals.push(result.proposal);
      generationInsights.push(result.insight);
      set({
        proposals,
        generationInsights,
        activeIndex: proposals.length - 1,
        generationStatus: "ready",
        statusMessage: result.insight.partial
          ? "Raffinamento applicato parzialmente con fallback sicuro."
          : `Raffinamento OpenAI applicato: ${result.insight.summary}`,
      });
    } catch (error) {
      set({
        generationStatus: "error",
        statusMessage: error instanceof Error ? error.message : "Raffinamento non riuscito",
      });
    }
  },
  setParameterValue: (parameterId, value) => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) return;
    const validationIssue = validateUiParameterValue(parameterId, value, active.targetFirmware);
    if (validationIssue) throw new Error(validationIssue);
    const definition = parameterById.get(parameterId);
    if (!definition || definition.scope === "global") {
      throw new Error("Le impostazioni globali non fanno parte della patch");
    }
    const next = structuredClone(active);
    next.proposalId = `${active.proposalId}-m${Date.now()}`;
    next.createdAt = new Date().toISOString();
    let found = false;
    const collections =
      definition.scope === "multi"
        ? next.multiSetup
          ? [next.multiSetup.panelControls, next.multiSetup.menuSettings]
          : []
        : next.parts
            .filter((part) => part.part === (state.activeScope === "multi-b" ? "B" : "A"))
            .flatMap((part) => [part.panelControls, part.menuSettings]);
    for (const collection of collections) {
      for (const setting of collection) {
        if (setting.parameterId !== parameterId) continue;
        setting.value = value;
        setting.displayValue =
          typeof value === "boolean"
            ? value
              ? "On"
              : "Off"
            : `${String(value)}${definition.unit ? ` ${definition.unit}` : ""}`;
        setting.confidence = 1;
        setting.rationale = "Valore modificato manualmente dall'utente.";
        found = true;
      }
    }
    if (!found) throw new Error(`Parametro ${parameterId} non presente nella proposta`);
    summitPatchProposalSchema.parse(next);
    const proposals = state.proposals.slice(0, state.activeIndex + 1);
    const generationInsights = state.generationInsights.slice(0, state.activeIndex + 1);
    proposals.push(next);
    generationInsights.push(state.generationInsights[state.activeIndex] ?? null);
    set({
      proposals,
      generationInsights,
      activeIndex: proposals.length - 1,
      statusMessage: "Patch modificata · stato non salvato.",
    });
  },
  selectParameter: (selectedParameterId) => set(displayStateForParameter(selectedParameterId)),
  setActiveGlobalLfo: (activeGlobalLfo) => set({ activeGlobalLfo }),
  setActiveModEnvelope: (activeModEnvelope) => set({ activeModEnvelope }),
  selectDisplayArea: (areaId) => {
    const area = displayAreaById.get(areaId);
    if (!area) return;
    if (area.kind === "slots" && isMatrixDisplayAreaId(area.id)) {
      set({
        activeDisplayAreaId: area.id,
        activeDisplayPage: 1,
        selectedDisplayFieldId: area.slotFields?.[0]?.id,
        selectedParameterId: undefined,
        ...(area.id === "mod" ? { activeModulationSlot: 1 } : { activeFxModulationSlot: 1 }),
      });
      return;
    }
    const firstField = firstMappedDisplayField(area, 1);
    set({
      activeDisplayAreaId: area.id,
      activeDisplayPage: 1,
      selectedDisplayFieldId: firstField?.id,
      selectedParameterId: firstField?.parameterId,
    });
  },
  setDisplayPage: (page) => {
    const state = get();
    const area = displayAreaById.get(state.activeDisplayAreaId);
    if (!area || area.kind !== "pages") return;
    const bounded = boundedDisplayPage(area, page);
    const firstField = firstMappedDisplayField(area, bounded);
    set({
      activeDisplayPage: bounded,
      selectedDisplayFieldId: firstField?.id,
      selectedParameterId: firstField?.parameterId,
    });
  },
  stepDisplayPage: (direction) => {
    const state = get();
    state.setDisplayPage(state.activeDisplayPage + direction);
  },
  selectDisplayField: (fieldId) => {
    const state = get();
    const area = displayAreaById.get(state.activeDisplayAreaId);
    if (!area) return;
    if (area.kind === "slots") {
      const field = area.slotFields?.find((candidate) => candidate.id === fieldId);
      if (!field) return;
      set({ selectedDisplayFieldId: field.id, selectedParameterId: undefined });
      return;
    }
    const page = area.pages.find((candidate) => candidate.page === state.activeDisplayPage);
    const field = page?.fields.find((candidate) => candidate.id === fieldId);
    if (!field) return;
    set({
      selectedDisplayFieldId: field.id,
      selectedParameterId: field.parameterId,
    });
  },
  setDisplaySlot: (areaId, slot) => {
    const area = displayAreaById.get(areaId);
    if (!area || area.kind !== "slots" || !area.slotCount) return;
    const bounded = Math.max(1, Math.min(area.slotCount, slot));
    set({
      activeDisplayAreaId: areaId,
      activeDisplayPage: 1,
      selectedDisplayFieldId: area.slotFields?.[0]?.id,
      selectedParameterId: undefined,
      ...(areaId === "mod"
        ? { activeModulationSlot: bounded }
        : { activeFxModulationSlot: bounded }),
    });
  },
  stepDisplaySlot: (direction) => {
    const state = get();
    if (!isMatrixDisplayAreaId(state.activeDisplayAreaId)) return;
    const current =
      state.activeDisplayAreaId === "mod"
        ? state.activeModulationSlot
        : state.activeFxModulationSlot;
    state.setDisplaySlot(state.activeDisplayAreaId, current + direction);
  },
  setMatrixFieldValue: (areaId, slot, fieldId, value) => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) return;
    const catalog = areaId === "mod" ? modulationCatalog : fxModulationCatalog;
    const validStringIds =
      fieldId === "destination"
        ? new Set(catalog.destinations.map((entity) => entity.id))
        : new Set(catalog.sources.map((entity) => entity.id));
    if (
      (fieldId === "depth" &&
        (typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < catalog.depthRange[0] ||
          value > catalog.depthRange[1])) ||
      (fieldId !== "depth" && (typeof value !== "string" || !validStringIds.has(value)))
    ) {
      throw new Error(`Valore matrice non valido: ${areaId}/${slot}/${fieldId}`);
    }
    const current = getMatrixAssignment(active, state.activeScope, areaId, slot);
    if (!current) throw new Error(`Slot matrice inesistente: ${areaId}/${slot}`);
    const next = structuredClone(active);
    next.proposalId = `${active.proposalId}-${areaId}-${slot}-${Date.now()}`;
    next.createdAt = new Date().toISOString();
    const nextPart = getScopePart(next, state.activeScope);
    const assignments = areaId === "mod" ? nextPart.modulationMatrix : nextPart.fxModulationMatrix;
    const updated = { ...current, rationale: "Valore matrice modificato manualmente dall'utente." };
    if (fieldId === "depth" && typeof value === "number") updated.depth = value;
    else if (fieldId === "sourceA" && typeof value === "string") updated.sourceA = value;
    else if (fieldId === "sourceB" && typeof value === "string") updated.sourceB = value;
    else if (fieldId === "destination" && typeof value === "string") updated.destination = value;
    const existingIndex = assignments.findIndex((assignment) => assignment.slot === slot);
    if (existingIndex >= 0) assignments[existingIndex] = updated;
    else assignments.push(updated);
    assignments.sort((left, right) => left.slot - right.slot);
    const valid = summitPatchProposalSchema.parse(next);
    const issues = validateProposalAgainstCatalog(valid);
    if (issues.length) throw new Error(issues[0]?.message ?? "Matrice non valida");
    const proposals = state.proposals.slice(0, state.activeIndex + 1);
    const generationInsights = state.generationInsights.slice(0, state.activeIndex + 1);
    proposals.push(valid);
    generationInsights.push(state.generationInsights[state.activeIndex] ?? null);
    set({
      proposals,
      generationInsights,
      activeIndex: proposals.length - 1,
      statusMessage: "Matrice modificata · stato non salvato.",
    });
  },
  setActiveScope: (scope) => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) {
      set({ activeScope: scope });
      return;
    }
    if (
      (scope === "single" && active.patch.mode === "single") ||
      (scope !== "single" && active.patch.mode === "multi")
    ) {
      set({ activeScope: scope });
      return;
    }
    const next = structuredClone(active);
    next.proposalId = `${active.proposalId}-${scope}-${Date.now()}`;
    next.createdAt = new Date().toISOString();
    if (scope === "single") {
      next.patch.mode = "single";
      next.parts = [next.parts.find((part) => part.part === "A") ?? next.parts[0]!];
      delete next.multiSetup;
    } else {
      next.patch.mode = "multi";
      const partA = next.parts.find((part) => part.part === "A") ?? next.parts[0]!;
      if (!next.parts.some((part) => part.part === "B")) {
        next.parts.push({ ...structuredClone(partA), part: "B" });
      }
      next.multiSetup ??= buildDefaultMultiSettings(next.targetFirmware);
    }
    const valid = summitPatchProposalSchema.parse(next);
    const proposals = state.proposals.slice(0, state.activeIndex + 1);
    const generationInsights = state.generationInsights.slice(0, state.activeIndex + 1);
    proposals.push(valid);
    generationInsights.push(state.generationInsights[state.activeIndex] ?? null);
    set({
      proposals,
      generationInsights,
      activeIndex: proposals.length - 1,
      activeScope: scope,
      statusMessage:
        scope === "single"
          ? "Scope Single attivo."
          : `Scope ${scope === "multi-a" ? "Multi A" : "Multi B"} attivo.`,
    });
  },
  toggleSetupMode: () => set((state) => ({ setupMode: !state.setupMode, setupStep: 0 })),
  nextSetupStep: () => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    const count = active
      ? buildPatchSetupChecklist(
          active,
          state.activeScope,
          state.setupFilter,
          state.setupOnlyModified,
        ).length
      : 0;
    if (count) set({ setupStep: (state.setupStep + 1) % count });
  },
  previousSetupStep: () => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    const count = active
      ? buildPatchSetupChecklist(
          active,
          state.activeScope,
          state.setupFilter,
          state.setupOnlyModified,
        ).length
      : 0;
    if (count) set({ setupStep: (state.setupStep - 1 + count) % count });
  },
  skipSetupStep: () => {
    const state = get();
    state.nextSetupStep();
    set({ statusMessage: "Passaggio Setup Mode saltato." });
  },
  toggleSetupOnlyModified: () =>
    set((state) => ({ setupOnlyModified: !state.setupOnlyModified, setupStep: 0 })),
  setSetupFilter: (setupFilter) => set({ setupFilter, setupStep: 0 }),
  undo: () => set((state) => ({ activeIndex: Math.max(0, state.activeIndex - 1) })),
  redo: () =>
    set((state) => ({ activeIndex: Math.min(state.proposals.length - 1, state.activeIndex + 1) })),
  loadProject: (project) => {
    const valid = summitProjectFileSchema.parse(project);
    const activeIndex = Math.max(
      0,
      valid.proposals.findIndex((proposal) => proposal.proposalId === valid.activeProposalId),
    );
    const selectedParameterId =
      valid.proposals[activeIndex]?.parts[0]?.panelControls[0]?.parameterId;
    set({
      proposals: valid.proposals,
      generationInsights: valid.proposals.map(() => null),
      activeIndex,
      activeScope: valid.proposals[activeIndex]?.patch.mode === "multi" ? "multi-a" : "single",
      ...displayStateForParameter(selectedParameterId),
      input: {
        ...initialInput,
        description: valid.input.description,
        referenceUrl: valid.input.reference?.url ?? "",
        targetSound: valid.input.reference?.targetSound ?? "",
        analysisMode: valid.input.audioFileReference
          ? "audio-assisted"
          : valid.input.reference
            ? "reference"
            : "text",
        ...(valid.input.audioFileReference
          ? { audioFileName: valid.input.audioFileReference.originalName }
          : {}),
      },
      generationStatus: "ready",
      statusMessage: "Progetto aperto e validato.",
    });
  },
  toProject: () => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) throw new Error("Nessuna proposta da salvare");
    const now = new Date().toISOString();
    const reference = parseReferenceUrl(state.input.referenceUrl);
    const timestampSeconds = parseTimestamp(state.input.timestamp);
    return summitProjectFileSchema.parse({
      fileFormat: "summit-patch-architect-project",
      version: "1.0.0",
      createdAt: state.proposals[0]?.createdAt ?? now,
      updatedAt: now,
      input: {
        description: state.input.description,
        ...(reference
          ? {
              reference: {
                platform: reference.platform,
                url: reference.originalUrl,
                ...(timestampSeconds === undefined ? {} : { timestampSeconds }),
                ...(state.input.targetSound ? { targetSound: state.input.targetSound } : {}),
              },
            }
          : {}),
        ...(state.input.audioFileName
          ? { audioFileReference: { originalName: state.input.audioFileName } }
          : {}),
      },
      proposals: state.proposals,
      activeProposalId: active.proposalId,
    });
  },
}));

export const selectActiveProposal = (state: AppState) => state.proposals[state.activeIndex];
export const selectActiveGenerationInsight = (state: AppState) =>
  state.generationInsights[state.activeIndex] ?? undefined;
export const selectIsDirty = (state: AppState) =>
  state.proposals.length > 1 && state.activeIndex > 0;
