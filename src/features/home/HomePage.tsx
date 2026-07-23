import { Link } from "react-router-dom";
import { demoConfigs } from "../../ai/demoPatches";
import { parameterCatalog } from "../../domain/catalog";
import { selectActiveProposal, useAppStore } from "../../stores/useAppStore";

export function HomePage() {
  const proposal = useAppStore(selectActiveProposal);
  const updateInput = useAppStore((state) => state.updateInput);

  return (
    <div className="page home-page">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow accent">SOUND → PATCH</span>
          <h1>Dal carattere sonoro a una patch Summit navigabile.</h1>
          <p>
            Descrivi il suono, aggiungi un riferimento o carica un estratto legale. L'MVP crea
            una proposta demo trasparente, validata contro un sottoinsieme documentato del
            Summit.
          </p>
          <div className="button-row">
            <Link className="button primary large" to="/new">
              Crea un nuovo suono <span>→</span>
            </Link>
            {proposal ? (
              <Link className="button subtle large" to="/panel">
                Continua “{proposal.patch.name}”
              </Link>
            ) : null}
          </div>
        </div>
        <div className="hero-visual" aria-label="Diagramma del flusso della patch">
          <div className="signal-card"><span>01</span><strong>Ascolta</strong><small>Descrizione / riferimento</small></div>
          <div className="signal-line" />
          <div className="signal-card active"><span>02</span><strong>Interpreta</strong><small>Ipotesi + confidenza</small></div>
          <div className="signal-line" />
          <div className="signal-card"><span>03</span><strong>Costruisci</strong><small>Pannello + menu + mod</small></div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card span-2">
          <div className="section-heading">
            <div><span className="eyebrow">PARTENZA RAPIDA</span><h2>Patch demo</h2></div>
            <span className="badge">5 fixture</span>
          </div>
          <div className="demo-grid">
            {demoConfigs.map((demo) => (
              <Link
                to="/new"
                className="demo-card"
                key={demo.id}
                onClick={() => updateInput({ description: demo.description, targetSound: "" })}
              >
                <span className={`demo-orb ${demo.category}`} />
                <strong>{demo.name}</strong>
                <small>{demo.category.toUpperCase()}</small>
                <p>{demo.description}</p>
              </Link>
            ))}
          </div>
        </article>
        <article className="card system-card">
          <span className="eyebrow">STATO SISTEMA</span>
          <h2>Vertical slice operativo</h2>
          <dl className="status-list">
            <div><dt>Provider</dt><dd><span className="status-dot green" /> Demo locale</dd></div>
            <div><dt>Catalogo MVP</dt><dd>{parameterCatalog.length} parametri verificati</dd></div>
            <div><dt>Audio cloud</dt><dd>Disattivato</dd></div>
            <div><dt>Link streaming</dt><dd>Solo contesto</dd></div>
            <div><dt>MIDI output</dt><dd>Non abilitato</dd></div>
          </dl>
          <p className="notice compact">Nessuna API key è necessaria per provare l'intero flusso demo.</p>
        </article>
      </section>
    </div>
  );
}
