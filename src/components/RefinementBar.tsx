import { useState } from "react";
import { selectActiveProposal, useAppStore } from "../stores/useAppStore";

export function RefinementBar() {
  const proposal = useAppStore(selectActiveProposal);
  const refine = useAppStore((state) => state.refine);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const activeIndex = useAppStore((state) => state.activeIndex);
  const versions = useAppStore((state) => state.proposals.length);
  const [instruction, setInstruction] = useState("");

  if (!proposal) return null;
  return (
    <section className="refinement-bar" aria-label="Raffinamento conversazionale">
      <div>
        <span className="eyebrow">RAFFINA LA PATCH</span>
        <strong>Versione {activeIndex + 1}</strong>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!instruction.trim()) return;
          void refine(instruction);
          setInstruction("");
        }}
      >
        <input
          aria-label="Istruzione di raffinamento"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Es. Rendila più scura senza perdere l'attacco…"
        />
        <button className="button primary" type="submit">
          Applica delta
        </button>
      </form>
      <div className="history-actions">
        <button className="icon-button" onClick={undo} disabled={activeIndex <= 0} aria-label="Annulla">
          ↶
        </button>
        <button className="icon-button" onClick={redo} disabled={activeIndex >= versions - 1} aria-label="Ripristina">
          ↷
        </button>
      </div>
    </section>
  );
}
