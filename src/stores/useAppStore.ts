import { create } from "zustand";
import { MockPatchProvider } from "../ai/mockProvider";
import type { AnalysisMode } from "../ai/provider";
import { validateProposalAgainstCatalog } from "../domain/catalog";
import { applyPatchDelta } from "../domain/patchDelta";
import { summitProjectFileSchema, type SummitPatchProposal, type SummitProjectFile } from "../domain/schemas";
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
  activeIndex: number;
  generationStatus: GenerationStatus;
  statusMessage: string;
  selectedParameterId: string | undefined;
  setupMode: boolean;
  setupStep: number;
  updateInput: (input: Partial<SoundInput>) => void;
  setAudioFileName: (name?: string) => void;
  generate: () => Promise<void>;
  refine: (instruction: string) => Promise<void>;
  setParameterValue: (parameterId: string, value: string | number | boolean) => void;
  selectParameter: (parameterId?: string) => void;
  toggleSetupMode: () => void;
  nextSetupStep: () => void;
  undo: () => void;
  redo: () => void;
  loadProject: (project: SummitProjectFile) => void;
  toProject: () => SummitProjectFile;
};

const provider = new MockPatchProvider();

const initialInput: SoundInput = {
  description: "Un pluck progressive-house brillante con transiente netto, decay corto e immagine stereo ampia.",
  referenceUrl: "",
  timestamp: "",
  targetSound: "",
  analysisMode: "text",
};

export const useAppStore = create<AppState>((set, get) => ({
  input: initialInput,
  proposals: [],
  activeIndex: -1,
  generationStatus: "idle",
  statusMessage: "Modalità demo pronta: nessuna credenziale necessaria.",
  selectedParameterId: undefined,
  setupMode: false,
  setupStep: 0,
  updateInput: (next) =>
    set((state) => ({
      input: { ...state.input, ...next },
    })),
  setAudioFileName: (name) =>
    set((state) => {
      const input = { ...state.input, analysisMode: name ? "audio-assisted" as const : state.input.referenceUrl ? "reference" as const : "text" as const };
      if (name) input.audioFileName = name;
      else delete input.audioFileName;
      return { input };
    }),
  generate: async () => {
    const { input } = get();
    if (!input.description.trim() && !input.referenceUrl.trim()) {
      set({ generationStatus: "error", statusMessage: "Descrivi il suono o inserisci un riferimento." });
      return;
    }
    try {
      set({ generationStatus: "analysing", statusMessage: "Analisi dell'intento sonoro…" });
      const reference = parseReferenceUrl(input.referenceUrl);
      if (reference && !input.targetSound.trim()) throw new Error("Indica quale suono vuoi riprodurre dal riferimento.");
      const timestampSeconds = parseTimestamp(input.timestamp);
      set({ generationStatus: "validating", statusMessage: "Validazione contro il catalogo Summit…" });
      const request = {
        description: input.description,
        mode: input.analysisMode,
        ...(input.targetSound ? { targetSound: input.targetSound } : {}),
        ...(reference
          ? {
              reference: {
                platform: reference.platform,
                url: reference.originalUrl,
                ...(timestampSeconds === undefined ? {} : { timestampSeconds }),
              },
            }
          : {}),
      };
      const proposal = await provider.generate(request);
      const issues = validateProposalAgainstCatalog(proposal);
      if (issues.length) throw new Error(`Proposta rifiutata: ${issues[0]?.message}`);
      set({
        proposals: [proposal],
        activeIndex: 0,
        generationStatus: "ready",
        statusMessage: "Proposta demo validata. Regola i controlli e prova un raffinamento.",
        selectedParameterId: proposal.parts[0]?.panelControls[0]?.parameterId,
        setupStep: 0,
      });
    } catch (error) {
      set({ generationStatus: "error", statusMessage: error instanceof Error ? error.message : "Generazione non riuscita" });
    }
  },
  refine: async (instruction) => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) throw new Error("Genera prima una proposta");
    set({ generationStatus: "analysing", statusMessage: "Calcolo del delta…" });
    try {
      const delta = await provider.refine(active, instruction);
      const next = applyPatchDelta(active, delta);
      const proposals = state.proposals.slice(0, state.activeIndex + 1);
      proposals.push(next);
      set({ proposals, activeIndex: proposals.length - 1, generationStatus: "ready", statusMessage: `Delta applicato: ${delta.changes[0]?.rationale ?? instruction}` });
    } catch (error) {
      set({ generationStatus: "error", statusMessage: error instanceof Error ? error.message : "Raffinamento non riuscito" });
    }
  },
  setParameterValue: (parameterId, value) => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    if (!active) return;
    const next = structuredClone(active);
    next.proposalId = `${active.proposalId}-m${Date.now()}`;
    next.createdAt = new Date().toISOString();
    let found = false;
    for (const part of next.parts) {
      for (const setting of [...part.panelControls, ...part.menuSettings]) {
        if (setting.parameterId !== parameterId) continue;
        setting.value = value;
        setting.displayValue = String(value);
        setting.confidence = 1;
        setting.rationale = "Valore modificato manualmente dall'utente.";
        found = true;
      }
    }
    if (!found) throw new Error(`Parametro ${parameterId} non presente nella proposta`);
    const issues = validateProposalAgainstCatalog(next);
    if (issues.length) throw new Error(issues[0]?.message ?? "Valore non valido");
    const proposals = state.proposals.slice(0, state.activeIndex + 1);
    proposals.push(next);
    set({ proposals, activeIndex: proposals.length - 1, statusMessage: "Modifica manuale salvata come nuova versione." });
  },
  selectParameter: (selectedParameterId) => set({ selectedParameterId }),
  toggleSetupMode: () => set((state) => ({ setupMode: !state.setupMode, setupStep: 0 })),
  nextSetupStep: () => {
    const state = get();
    const active = state.proposals[state.activeIndex];
    const count = active?.setupInstructions.length ?? 0;
    if (count) set({ setupStep: (state.setupStep + 1) % count });
  },
  undo: () => set((state) => ({ activeIndex: Math.max(0, state.activeIndex - 1) })),
  redo: () => set((state) => ({ activeIndex: Math.min(state.proposals.length - 1, state.activeIndex + 1) })),
  loadProject: (project) => {
    const valid = summitProjectFileSchema.parse(project);
    const activeIndex = Math.max(0, valid.proposals.findIndex((proposal) => proposal.proposalId === valid.activeProposalId));
    set({ proposals: valid.proposals, activeIndex, input: { ...initialInput, description: valid.input.description, referenceUrl: valid.input.reference?.url ?? "", targetSound: valid.input.reference?.targetSound ?? "", analysisMode: valid.input.audioFileReference ? "audio-assisted" : valid.input.reference ? "reference" : "text", ...(valid.input.audioFileReference ? { audioFileName: valid.input.audioFileReference.originalName } : {}) }, generationStatus: "ready", statusMessage: "Progetto aperto e validato." });
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
        ...(reference ? { reference: { platform: reference.platform, url: reference.originalUrl, ...(timestampSeconds === undefined ? {} : { timestampSeconds }), ...(state.input.targetSound ? { targetSound: state.input.targetSound } : {}) } } : {}),
        ...(state.input.audioFileName ? { audioFileReference: { originalName: state.input.audioFileName } } : {}),
      },
      proposals: state.proposals,
      activeProposalId: active.proposalId,
    });
  },
}));

export const selectActiveProposal = (state: AppState) => state.proposals[state.activeIndex];
