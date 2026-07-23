import { Link } from "react-router-dom";
import { MetricRing } from "../../components/MetricRing";
import { SummitPanel } from "../../components/SummitPanel";
import { changedParameterIds } from "../../domain/patchDelta";
import { selectActiveProposal, useAppStore } from "../../stores/useAppStore";
import { ParameterInspector } from "./ParameterInspector";

export function PhysicalPanelPage() {
  const proposal = useAppStore(selectActiveProposal);
  const proposals = useAppStore((state) => state.proposals);
  const activeIndex = useAppStore((state) => state.activeIndex);
  const selectedParameterId = useAppStore((state) => state.selectedParameterId);
  const selectParameter = useAppStore((state) => state.selectParameter);
  const setupMode = useAppStore((state) => state.setupMode);
  const setupStep = useAppStore((state) => state.setupStep);
  const toggleSetupMode = useAppStore((state) => state.toggleSetupMode);
  const nextSetupStep = useAppStore((state) => state.nextSetupStep);

  if (!proposal) return <div className="empty-state"><span className="empty-icon">◉</span><h1>Nessuna patch da visualizzare</h1><p>Genera una proposta demo per popolare pannello, menu e modulazioni.</p><Link className="button primary" to="/new">Crea un nuovo suono</Link></div>;

  const previous = activeIndex > 0 ? proposals[activeIndex - 1] : undefined;
  const changedIds = previous ? changedParameterIds(previous, proposal) : [];
  const instruction = proposal.setupInstructions[setupStep];

  return (
    <div className="page panel-page">
      <header className="page-heading panel-heading">
        <div><span className="eyebrow accent">PHYSICAL PANEL · PART A</span><h1>{proposal.patch.name}</h1><p>{proposal.patch.description}</p></div>
        <div className="panel-summary"><MetricRing value={proposal.analysis.overallConfidence} label="confidenza" /><div><span className="eyebrow">VERSIONE</span><strong>{activeIndex + 1} / {proposals.length}</strong></div><button className={`button ${setupMode ? "primary" : "subtle"}`} onClick={toggleSetupMode}>{setupMode ? "Esci dal setup" : "Avvia setup mode"}</button></div>
      </header>
      {setupMode && instruction ? <section className="setup-banner"><div className="step-number">{String(instruction.order).padStart(2, "0")}</div><div><span className="eyebrow">PROSSIMO PASSO · {instruction.area.toUpperCase()}</span><strong>{instruction.instruction}</strong></div><button className="button primary" onClick={nextSetupStep}>Fatto, avanti →</button></section> : null}
      <div className="panel-layout">
        <section className="card panel-card"><div className="panel-toolbar"><div><span className="status-dot blue" /> Vista funzionale originale</div><div><span className="legend changed" /> modificato <span className="legend selected" /> selezionato <span className="legend setup" /> setup</div></div><SummitPanel proposal={proposal} selectedParameterId={selectedParameterId} changedIds={changedIds} highlightedIds={setupMode ? instruction?.parameterIds ?? [] : []} onSelect={selectParameter} /><div className="panel-caption">Controlli verificati del vertical slice. Zoom del browser e scrolling orizzontale mantengono la leggibilità ad alta densità.</div></section>
        <ParameterInspector proposal={proposal} parameterId={selectedParameterId} />
      </div>
      <section className="strategy-grid"><article className="card"><span className="eyebrow">OSCILLATORI</span><p>{proposal.analysis.oscillatorStrategy}</p></article><article className="card"><span className="eyebrow">FILTRO</span><p>{proposal.analysis.filterStrategy}</p></article><article className="card"><span className="eyebrow">MODULAZIONE</span><p>{proposal.analysis.modulationStrategy}</p></article><article className="card"><span className="eyebrow">EFFETTI</span><p>{proposal.analysis.effectsStrategy}</p></article></section>
    </div>
  );
}
