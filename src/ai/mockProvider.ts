import { parameterById, validateProposalAgainstCatalog } from "../domain/catalog";
import { applyPatchDelta } from "../domain/patchDelta";
import { summitPatchDeltaSchema, type SummitPatchProposal } from "../domain/schemas";
import { buildDemoProposal, chooseDemo } from "./demoPatches";
import type { PatchGenerationRequest, PatchGenerationResult, PatchProvider } from "./provider";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function findValue(proposal: SummitPatchProposal, parameterId: string) {
  for (const part of proposal.parts) {
    const setting = [...part.panelControls, ...part.menuSettings].find(
      (candidate) => candidate.parameterId === parameterId,
    );
    if (setting) return setting.value;
  }
  throw new Error(`Parametro ${parameterId} assente dalla proposta`);
}

function clamp(parameterId: string, value: number): number {
  const definition = parameterById.get(parameterId);
  return Math.max(definition?.minimum ?? value, Math.min(definition?.maximum ?? value, value));
}

export class MockPatchProvider implements PatchProvider {
  readonly id = "mock";
  readonly displayName = "Demo locale";
  readonly requiresCredentials = false;

  async generate(request: PatchGenerationRequest): Promise<PatchGenerationResult> {
    await wait(280);
    const proposal = buildDemoProposal(
      chooseDemo(`${request.description} ${request.targetSound ?? ""}`),
      request.targetSound || request.description,
    );
    const issues = validateProposalAgainstCatalog(proposal);
    if (issues.length > 0) throw new Error(`Fixture demo non valida: ${issues[0]?.message}`);
    return {
      proposal,
      insight: {
        provider: this.id,
        summary: proposal.analysis.synthesisHypothesis,
        sectionConfidence: [],
        assumptions: proposal.analysis.assumptions,
        warnings: proposal.analysis.uncertainties,
        repaired: false,
        partial: false,
      },
    };
  }

  async refine(proposal: SummitPatchProposal, instruction: string): Promise<PatchGenerationResult> {
    await wait(180);
    const text = instruction.toLowerCase();
    let parameterId = "filter.frequency";
    let amount = -22;
    let rationale = "Riduce la brillantezza chiudendo il filtro, senza cambiare la struttura.";

    if (text.includes("attacco") || text.includes("attack") || text.includes("transient")) {
      parameterId = "amp.attack";
      amount = text.includes("lento") || text.includes("slow") ? -14 : 14;
      rationale = "Modifica solo l'attacco dell'inviluppo di ampiezza.";
    } else if (text.includes("stereo") || text.includes("largo") || text.includes("wide")) {
      parameterId = "fx.chorus.level";
      amount = 16;
      rationale = "Aumenta il chorus per ampliare l'immagine, lasciando invariato il corpo.";
    } else if (text.includes("reverb") || text.includes("riverbero")) {
      parameterId = "fx.reverb.level";
      amount = text.includes("meno") || text.includes("less") ? -18 : 18;
      rationale = "Varia soltanto il livello del riverbero.";
    } else if (text.includes("aggress") || text.includes("drive")) {
      parameterId = "filter.overdrive";
      amount = 18;
      rationale = "Aumenta l'overdrive pre-filtro per un transiente più incisivo.";
    } else if (text.includes("chiaro") || text.includes("bright")) {
      amount = 22;
      rationale = "Apre il filtro per aumentare la brillantezza.";
    }

    const previousValue = findValue(proposal, parameterId);
    if (typeof previousValue !== "number") {
      throw new Error("Il mock refinement supporta solo variazioni numeriche");
    }
    const newValue = clamp(parameterId, previousValue + amount);
    const delta = summitPatchDeltaSchema.parse({
      baseProposalId: proposal.proposalId,
      userInstruction: instruction,
      changes: [{ parameterId, previousValue, newValue, rationale }],
      unchangedStrategy: ["Oscillatori", "Bilanciamento mixer", "Routing di modulazione"],
      warnings: ["Raffinamento demo deterministico: verificare il risultato all'ascolto."],
    });
    const next = applyPatchDelta(proposal, delta);
    return {
      proposal: next,
      insight: {
        provider: this.id,
        summary: delta.changes[0]?.rationale ?? instruction,
        sectionConfidence: [],
        assumptions: delta.unchangedStrategy,
        warnings: delta.warnings,
        repaired: false,
        partial: false,
      },
    };
  }
}
