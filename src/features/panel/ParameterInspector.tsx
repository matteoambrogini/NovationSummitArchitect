import { parameterById } from "../../domain/catalog";
import type { SummitPatchProposal } from "../../domain/schemas";
import { useAppStore } from "../../stores/useAppStore";

export function ParameterInspector({ proposal, parameterId }: { proposal: SummitPatchProposal; parameterId: string | undefined }) {
  const setParameterValue = useAppStore((state) => state.setParameterValue);
  const definition = parameterId ? parameterById.get(parameterId) : undefined;
  const setting = parameterId
    ? proposal.parts.flatMap((part) => [...part.panelControls, ...part.menuSettings]).find((candidate) => candidate.parameterId === parameterId)
    : undefined;

  if (!definition || !setting) {
    return <aside className="card inspector empty"><span className="eyebrow">INSPECTOR</span><p>Seleziona un controllo per vedere valore, intervallo, razionale e fonte.</p></aside>;
  }

  return (
    <aside className="card inspector">
      <div className="inspector-heading"><div><span className="eyebrow">{definition.section.toUpperCase()}</span><h2>{definition.label}</h2></div><span className="confidence-pill">{Math.round(setting.confidence * 100)}%</span></div>
      <div className="current-value"><span>VALORE PROPOSTO</span><strong>{setting.displayValue}{definition.unit ? ` ${definition.unit}` : ""}</strong></div>
      {typeof setting.value === "number" && definition.minimum !== undefined && definition.maximum !== undefined ? (
        <div className="manual-control"><label htmlFor="manual-value">Modifica manuale <span>{definition.minimum} — {definition.maximum}</span></label><input id="manual-value" type="range" min={definition.minimum} max={definition.maximum} step={definition.step ?? 1} value={setting.value} onChange={(event) => setParameterValue(definition.id, Number(event.target.value))} /></div>
      ) : definition.enumValues ? (
        <div className="manual-control"><label htmlFor="manual-value">Modifica manuale</label><select id="manual-value" value={String(setting.value)} onChange={(event) => setParameterValue(definition.id, event.target.value)}>{definition.enumValues.map((value) => <option key={value}>{value}</option>)}</select></div>
      ) : null}
      <dl className="inspector-details"><div><dt>Perché</dt><dd>{setting.rationale}</dd></div><div><dt>Effetto sonoro</dt><dd>{definition.sonicEffect}</dd></div><div><dt>Ambito</dt><dd>{definition.scope === "part" ? "Parte A / B" : definition.scope}</dd></div>{definition.location.type === "menu" ? <div><dt>Navigazione</dt><dd>{definition.location.menu} · pagina {definition.location.page} · riga {definition.location.row ?? "—"}</dd></div> : <div><dt>Posizione</dt><dd>Pannello fisico · {definition.location.controlId}</dd></div>}</dl>
      <a className="source-link" href={definition.documentation.sourceUrl} target="_blank" rel="noreferrer">Fonte: {definition.documentation.document}, p. {definition.documentation.page} ↗</a>
      <p className="verified-line"><span className="status-dot green" /> Verificato il {definition.documentation.verifiedAt}</p>
    </aside>
  );
}
