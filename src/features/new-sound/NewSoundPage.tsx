import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { copy } from "../../i18n/it";
import { useAppStore } from "../../stores/useAppStore";
import { AudioWorkbench } from "./AudioWorkbench";

const examples = [
  "Pluck progressive-house brillante e largo",
  "Pad analogico caldo e instabile",
  "Reese bass scuro con sub mono",
  "Campana FM metallica e dinamica",
];

export function NewSoundPage() {
  const input = useAppStore((state) => state.input);
  const updateInput = useAppStore((state) => state.updateInput);
  const generate = useAppStore((state) => state.generate);
  const status = useAppStore((state) => state.generationStatus);
  const navigate = useNavigate();

  useEffect(() => {
    const analysisMode = input.audioFileName
      ? "audio-assisted"
      : input.referenceUrl.trim()
        ? "reference"
        : "text";
    if (analysisMode !== input.analysisMode) updateInput({ analysisMode });
  }, [input.analysisMode, input.audioFileName, input.referenceUrl, updateInput]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await generate();
    if (useAppStore.getState().generationStatus === "ready") void navigate("/panel");
  };

  return (
    <div className="page new-sound-page">
      <header className="page-heading">
        <div><span className="eyebrow accent">NUOVA ANALISI</span><h1>Che suono vuoi costruire?</h1><p>Più descrivi attacco, corpo, movimento e spazio, più l'ipotesi sarà utile.</p></div>
        <div className="mode-chip"><span className="status-dot green" />{input.analysisMode === "audio-assisted" ? "Audio-assisted" : input.analysisMode === "reference" ? "Reference-only" : "Text mode"}</div>
      </header>

      <form className="sound-form" onSubmit={(event) => void submit(event)}>
        <section className="card input-card">
          <div className="field-group">
            <label htmlFor="description">Descrizione sonora</label>
            <textarea id="description" rows={5} value={input.description} onChange={(event) => updateInput({ description: event.target.value })} placeholder="Descrivi timbro, attacco, inviluppo, movimento, stereo e ruolo musicale…" />
            <div className="example-chips">{examples.map((example) => <button key={example} type="button" onClick={() => updateInput({ description: example })}>{example}</button>)}</div>
          </div>
          <div className="divider"><span>riferimento facoltativo</span></div>
          <div className="two-column-fields">
            <div className="field-group"><label htmlFor="reference-url">Spotify o YouTube</label><input id="reference-url" type="url" value={input.referenceUrl} onChange={(event) => updateInput({ referenceUrl: event.target.value })} placeholder="https://open.spotify.com/track/…" /></div>
            <div className="field-group short"><label htmlFor="timestamp">Timestamp</label><input id="timestamp" value={input.timestamp} onChange={(event) => updateInput({ timestamp: event.target.value })} placeholder="01:14" /></div>
          </div>
          {input.referenceUrl ? <div className="field-group"><label htmlFor="target-sound">Quale suono? <span className="required">obbligatorio con un link</span></label><input id="target-sound" value={input.targetSound} onChange={(event) => updateInput({ targetSound: event.target.value })} placeholder="Es. il lead principale che entra sul downbeat" /></div> : null}
          <p className="notice">Per un'analisi audio più precisa, carica un breve estratto ottenuto legalmente oppure descrivi il suono e indica il timestamp. L'app non scarica o estrae audio da Spotify o YouTube.</p>
          <AudioWorkbench />
        </section>
        <aside className="card generation-card">
          <span className="eyebrow">CONTRATTO DI ANALISI</span>
          <h2>{input.analysisMode === "text" ? copy.modes.text : input.analysisMode === "reference" ? "Riferimento contestuale" : "Audio assistito"}</h2>
          <p>{input.analysisMode === "text" ? "La patch è un'ipotesi basata sul linguaggio naturale e sulla conoscenza di sintesi." : input.analysisMode === "reference" ? copy.modes.reference : copy.modes.audio}</p>
          <ul className="check-list"><li>JSON validato con Zod</li><li>Solo parametri del catalogo verificato</li><li>Confidenza e incertezze visibili</li><li>Nessuna pretesa di replica esatta</li></ul>
          <div className="generation-flow"><span className={status === "analysing" ? "active" : ""}>1 · Intento</span><span className={status === "validating" ? "active" : ""}>2 · Catalogo</span><span className={status === "ready" ? "active" : ""}>3 · Patch</span></div>
          <button className="button primary large full" type="submit" disabled={status === "analysing" || status === "validating"}>{status === "analysing" || status === "validating" ? "Generazione…" : "Genera proposta demo →"}</button>
          <small className="privacy-line">⌁ Tutto resta locale in modalità demo.</small>
        </aside>
      </form>
    </div>
  );
}
