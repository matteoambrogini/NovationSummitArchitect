import { useNavigate } from "react-router-dom";
import { copy } from "../../i18n/it";
import { useAppStore } from "../../stores/useAppStore";

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
  const statusMessage = useAppStore((state) => state.statusMessage);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await generate();
    if (useAppStore.getState().generationStatus === "ready") void navigate("/panel");
  };

  const busy = status === "analysing" || status === "validating";

  return (
    <div className="page new-sound-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow accent">{copy.ai.newSoundEyebrow}</span>
          <h1>{copy.ai.newSoundTitle}</h1>
          <p>{copy.ai.newSoundDescription}</p>
        </div>
        <div className="mode-chip">
          <span className="status-dot green" />
          {copy.ai.textMode}
        </div>
      </header>

      <form className="sound-form" onSubmit={(event) => void submit(event)}>
        <section className="card input-card">
          <div className="field-group">
            <label htmlFor="description">{copy.ai.descriptionLabel}</label>
            <textarea
              id="description"
              rows={8}
              value={input.description}
              onChange={(event) =>
                updateInput({ description: event.target.value, analysisMode: "text" })
              }
              placeholder={copy.ai.descriptionPlaceholder}
            />
            <div className="example-chips">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => updateInput({ description: example, analysisMode: "text" })}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
          <p className="notice">{copy.ai.textOnlyNotice}</p>
          <output
            className={`generation-status${status === "error" ? " error" : ""}`}
            aria-live="polite"
          >
            {statusMessage}
          </output>
        </section>

        <aside className="card generation-card">
          <span className="eyebrow">{copy.ai.contractEyebrow}</span>
          <h2>{copy.ai.contractTitle}</h2>
          <p>{copy.ai.contractDescription}</p>
          <ul className="check-list">
            {copy.ai.contractChecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="generation-flow">
            <span className={status === "analysing" ? "active" : ""}>{copy.ai.flow[0]}</span>
            <span className={status === "validating" ? "active" : ""}>{copy.ai.flow[1]}</span>
            <span className={status === "ready" ? "active" : ""}>{copy.ai.flow[2]}</span>
          </div>
          <button className="button primary large full" type="submit" disabled={busy}>
            {busy ? copy.ai.generating : copy.ai.generate}
          </button>
          <small className="privacy-line">⌁ {copy.ai.privacy}</small>
        </aside>
      </form>
    </div>
  );
}
