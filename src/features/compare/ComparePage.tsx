import { Link } from "react-router-dom";
import { parameterById } from "../../domain/catalog";
import { changedParameterIds } from "../../domain/patchDelta";
import { copy } from "../../i18n/it";
import { selectActiveProposal, useAppStore } from "../../stores/useAppStore";

function valuesById(proposal: NonNullable<ReturnType<typeof selectActiveProposal>>) {
  return new Map(
    proposal.parts.flatMap((part) =>
      [...part.panelControls, ...part.menuSettings].map(
        (setting) => [setting.parameterId, setting.displayValue] as const,
      ),
    ),
  );
}

export function ComparePage() {
  const active = useAppStore(selectActiveProposal);
  const proposals = useAppStore((state) => state.proposals);
  const activeIndex = useAppStore((state) => state.activeIndex);
  if (!active)
    return (
      <div className="empty-state">
        <span className="empty-icon">⇄</span>
        <h1>Nessuna versione da confrontare</h1>
        <p>Genera e raffina una patch per visualizzare il diff.</p>
        <Link className="button primary" to="/new">
          Genera proposta
        </Link>
      </div>
    );
  const baseline = proposals[Math.max(0, activeIndex - 1)]!;
  const ids = changedParameterIds(baseline, active);
  const before = valuesById(baseline);
  const after = valuesById(active);

  return (
    <div className="page compare-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow accent">A/B COMPARISON</span>
          <h1>Confronto tra versioni</h1>
          <p>
            Solo i parametri cambiati vengono evidenziati; il resto della strategia rimane stabile.
          </p>
        </div>
        <span className="badge">{ids.length} modifiche</span>
      </header>
      <div className="comparison-head">
        <article className="card">
          <span className="version-index">
            A · {String(Math.max(1, activeIndex)).padStart(2, "0")}
          </span>
          <h2>{baseline.patch.name}</h2>
          <p>{baseline.patch.description}</p>
        </article>
        <div className="comparison-arrow">→</div>
        <article className="card active-version">
          <span className="version-index">B · {String(activeIndex + 1).padStart(2, "0")}</span>
          <h2>{active.patch.name}</h2>
          <p>{active.patch.description}</p>
        </article>
      </div>
      {ids.length ? (
        <section className="card table-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PATCH DELTA</span>
              <h2>Parametri cambiati</h2>
            </div>
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Parametro</th>
                  <th>Prima</th>
                  <th>Dopo</th>
                  <th>Intento udibile</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((id) => (
                  <tr key={id}>
                    <td>
                      <strong>{parameterById.get(id)?.label ?? id}</strong>
                      <code>{id}</code>
                    </td>
                    <td>
                      <span className="before-value">{before.get(id)}</span>
                    </td>
                    <td>
                      <span className="after-value">{after.get(id)}</span>
                    </td>
                    <td>
                      {
                        active.parts
                          .flatMap((part) => [...part.panelControls, ...part.menuSettings])
                          .find((setting) => setting.parameterId === id)?.rationale
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card no-diff">
          <span className="empty-icon">＝</span>
          <h2>La proposta iniziale è ancora attiva</h2>
          <p>Usa il campo “Raffina la patch” per creare una seconda versione e vedere il delta.</p>
        </section>
      )}
      <section className="card unchanged-card">
        <span className="eyebrow">STRATEGIA PRESERVATA</span>
        <div className="tag-row">
          <span>Oscillatori</span>
          <span>Bilanciamento mixer</span>
          <span>Routing modulazione</span>
          <span>Ambito Part A</span>
          <span>Compatibilità catalogo</span>
        </div>
      </section>
      <section className="card history-card">
        <span className="eyebrow">{copy.ai.history}</span>
        <ol>
          {proposals.map((proposal, index) => (
            <li key={proposal.proposalId} className={index === activeIndex ? "active" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{proposal.patch.name}</strong>
              <small>{new Date(proposal.createdAt).toLocaleString("it-IT")}</small>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
