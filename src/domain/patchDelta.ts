import { summitPatchProposalSchema, type SummitPatchDelta, type SummitPatchProposal } from "./schemas";

export function applyPatchDelta(
  proposal: SummitPatchProposal,
  delta: SummitPatchDelta,
): SummitPatchProposal {
  if (delta.baseProposalId !== proposal.proposalId) {
    throw new Error("Il delta non appartiene alla proposta attiva");
  }

  const changeMap = new Map(delta.changes.map((change) => [change.parameterId, change]));
  const next = structuredClone(proposal);
  next.proposalId = `${proposal.proposalId}-r${Date.now()}`;
  next.createdAt = new Date().toISOString();
  next.patch.name = `${proposal.patch.name.slice(0, 13)} R`;

  let applied = 0;
  for (const part of next.parts) {
    for (const setting of [...part.panelControls, ...part.menuSettings]) {
      const change = changeMap.get(setting.parameterId);
      if (!change) continue;
      if (setting.value !== change.previousValue) {
        throw new Error(`Valore precedente non coerente per ${setting.parameterId}`);
      }
      setting.value = change.newValue;
      setting.displayValue = String(change.newValue);
      setting.rationale = change.rationale;
      applied += 1;
    }
  }
  if (applied !== delta.changes.length) {
    throw new Error("Il delta contiene parametri non presenti nella proposta base");
  }
  return summitPatchProposalSchema.parse(next);
}

export function changedParameterIds(
  before: SummitPatchProposal,
  after: SummitPatchProposal,
): string[] {
  const beforeValues = new Map(
    before.parts.flatMap((part) =>
      [...part.panelControls, ...part.menuSettings].map((setting) => [setting.parameterId, setting.value] as const),
    ),
  );
  return after.parts.flatMap((part) =>
    [...part.panelControls, ...part.menuSettings]
      .filter((setting) => beforeValues.get(setting.parameterId) !== setting.value)
      .map((setting) => setting.parameterId),
  );
}
