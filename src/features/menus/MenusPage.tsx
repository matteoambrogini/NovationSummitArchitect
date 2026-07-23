import { Link } from "react-router-dom";
import { parameterById } from "../../domain/catalog";
import { selectActiveProposal, useAppStore } from "../../stores/useAppStore";

export function MenusPage() {
  const proposal = useAppStore(selectActiveProposal);
  if (!proposal) return <div className="empty-state"><span className="empty-icon">▤</span><h1>Nessun menu da mostrare</h1><p>Genera una proposta per ottenere menu e matrici.</p><Link className="button primary" to="/new">Genera proposta</Link></div>;
  const part = proposal.parts[0]!;

  return (
    <div className="page menus-page">
      <header className="page-heading"><div><span className="eyebrow accent">DISPLAY & MENUS · PART A</span><h1>Configurazione oltre il pannello</h1><p>Short label, pagina e istruzioni sono ricavati esclusivamente dal catalogo verificato.</p></div><span className="badge">{part.menuSettings.length} impostazioni · {part.modulationMatrix.length + part.fxModulationMatrix.length} routing</span></header>
      <section className="menu-overview">
        <div className="oled-device"><div className="oled-screen"><div className="oled-title">OSC COMN 1 <span>1/8</span></div><div><span>Drift</span><strong>{part.menuSettings.find((setting) => setting.parameterId === "osc.common.drift")?.displayValue ?? 0} ◀</strong></div><div><span>TuningTable</span><strong>0</strong></div><div><span>KeySync</span><strong>Off</strong></div></div><div className="oled-controls"><button aria-label="Pagina precedente">‹</button><button aria-label="Pagina successiva">›</button><span className="encoder" /></div></div>
        <article className="card navigation-guide"><span className="eyebrow">NAVIGAZIONE ATTIVA</span><h2>OSC → pagina 1</h2><p>Premi <strong>OSC</strong> → vai a pagina <strong>1</strong> → seleziona <strong>Drift</strong> → imposta il valore indicato.</p><div className="key-path"><kbd>OSC</kbd><span>→</span><kbd>PAGE 1</kbd><span>→</span><kbd>ROW 3</kbd></div></article>
      </section>
      <section className="card table-card"><div className="section-heading"><div><span className="eyebrow">PARAMETRI MENU</span><h2>Impostazioni verificate</h2></div></div><div className="responsive-table"><table><thead><tr><th>Display</th><th>Parametro</th><th>Percorso</th><th>Valore</th><th>Confidenza</th><th>Razionale</th></tr></thead><tbody>{part.menuSettings.map((setting) => { const definition = parameterById.get(setting.parameterId); const location = definition?.location.type === "menu" ? definition.location : undefined; return <tr key={setting.parameterId}><td><code>{definition?.shortDisplayLabel ?? definition?.label}</code></td><td>{definition?.label}</td><td>{location?.menu} · p. {location?.page} · r. {location?.row}</td><td><strong>{setting.displayValue}</strong></td><td><span className="confidence-bar"><i style={{ width: `${setting.confidence * 100}%` }} /></span>{Math.round(setting.confidence * 100)}%</td><td>{setting.rationale}</td></tr>; })}</tbody></table></div></section>
      <div className="matrix-grid">
        <section className="card table-card"><div className="section-heading"><div><span className="eyebrow">MOD MATRIX</span><h2>Routing di sintesi</h2></div><span className="badge">16 slot disponibili</span></div><div className="responsive-table"><table><thead><tr><th>Slot</th><th>Source A</th><th>Source B</th><th>Destination</th><th>Depth</th></tr></thead><tbody>{part.modulationMatrix.map((assignment) => <tr key={assignment.slot}><td><span className="slot-number">{assignment.slot}</span></td><td>{assignment.sourceA}</td><td>{assignment.sourceB ?? "Direct"}</td><td>{parameterById.get(assignment.destination)?.label ?? assignment.destination}</td><td><strong className={assignment.depth >= 0 ? "positive" : "negative"}>{assignment.depth >= 0 ? "+" : ""}{assignment.depth}</strong></td></tr>)}</tbody></table></div></section>
        <section className="card table-card"><div className="section-heading"><div><span className="eyebrow">FX MOD MATRIX</span><h2>Routing effetti</h2></div><span className="badge">4 slot disponibili</span></div><div className="responsive-table"><table><thead><tr><th>Slot</th><th>Source A</th><th>Destination</th><th>Depth</th></tr></thead><tbody>{part.fxModulationMatrix.map((assignment) => <tr key={assignment.slot}><td><span className="slot-number purple">{assignment.slot}</span></td><td>{assignment.sourceA}</td><td>{parameterById.get(assignment.destination)?.label ?? assignment.destination}</td><td><strong className="positive">+{assignment.depth}</strong></td></tr>)}</tbody></table></div></section>
      </div>
    </div>
  );
}
