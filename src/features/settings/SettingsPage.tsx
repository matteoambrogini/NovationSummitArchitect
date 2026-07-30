import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { copy } from "../../i18n/it";

type MidiSnapshot = {
  inputs: string[];
  outputs: string[];
  summitDetected: boolean;
  warnings: string[];
};

export function SettingsPage() {
  const [midi, setMidi] = useState<MidiSnapshot>();
  const [message, setMessage] = useState("La diagnostica MIDI richiede l'app desktop.");

  const diagnose = async () => {
    if (!window.__TAURI_INTERNALS__) {
      setMessage("Apri la build Tauri per interrogare le porte MIDI native.");
      return;
    }
    try {
      const snapshot = await invoke<MidiSnapshot>("list_midi_devices");
      setMidi(snapshot);
      setMessage(
        snapshot.summitDetected
          ? "Novation Summit rilevato."
          : "Nessun dispositivo con nome Summit rilevato.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Diagnostica MIDI non riuscita");
    }
  };

  return (
    <div className="page settings-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow accent">PREFERENZE</span>
          <h1>Impostazioni e diagnostica</h1>
          <p>Provider opzionali, consenso esplicito e MIDI nativo in sola lettura.</p>
        </div>
      </header>
      <div className="settings-grid">
        <section className="card settings-section">
          <div className="settings-icon">AI</div>
          <div className="settings-content">
            <span className="eyebrow">PROVIDER</span>
            <h2>Generazione patch</h2>
            <label htmlFor="provider">Provider attivo</label>
            <select id="provider" value="openai" disabled>
              <option value="openai">{copy.ai.activeProvider}</option>
            </select>
            <p className="notice compact">{copy.ai.backendOnly}</p>
            <dl className="status-list">
              <div>
                <dt>API</dt>
                <dd>Responses API</dd>
              </div>
              <div>
                <dt>Privacy</dt>
                <dd>store: false</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>JSON Schema strict</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="card settings-section">
          <div className="settings-icon midi">M</div>
          <div className="settings-content">
            <span className="eyebrow">MIDI NATIVO</span>
            <h2>Diagnostica Summit</h2>
            <p>{message}</p>
            <button className="button primary" onClick={() => void diagnose()}>
              Scansiona dispositivi
            </button>
            {midi ? (
              <dl className="status-list">
                <div>
                  <dt>Summit</dt>
                  <dd>{midi.summitDetected ? "Rilevato" : "Non rilevato"}</dd>
                </div>
                <div>
                  <dt>Input</dt>
                  <dd>{midi.inputs.join(", ") || "Nessuno"}</dd>
                </div>
                <div>
                  <dt>Output</dt>
                  <dd>{midi.outputs.join(", ") || "Nessuno"}</dd>
                </div>
              </dl>
            ) : null}
            <p className="warning-line">⚠ Non vengono inviati CC, NRPN o SysEx non documentati.</p>
          </div>
        </section>
        <section className="card settings-section">
          <div className="settings-icon privacy">⌁</div>
          <div className="settings-content">
            <span className="eyebrow">PRIVACY</span>
            <h2>Audio e servizi esterni</h2>
            <label className="toggle-row">
              <span>
                <strong>Analisi audio cloud</strong>
                <small>Invia estratti solo con consenso esplicito</small>
              </span>
              <input type="checkbox" disabled />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Metadati Spotify / YouTube</strong>
                <small>Adapter disattivati finché non configurati</small>
              </span>
              <input type="checkbox" disabled />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Telemetria</strong>
                <small>Nessuna telemetria nell'MVP</small>
              </span>
              <input type="checkbox" disabled />
            </label>
          </div>
        </section>
        <section className="card settings-section">
          <div className="settings-icon storage">▣</div>
          <div className="settings-content">
            <span className="eyebrow">ARCHIVIAZIONE</span>
            <h2>Progetti locali</h2>
            <p>
              Formato versionato <code>.summitproject</code>, validato prima di apertura e
              salvataggio.
            </p>
            <dl className="status-list">
              <div>
                <dt>Formato</dt>
                <dd>1.0.0</dd>
              </div>
              <div>
                <dt>Autosave recovery</dt>
                <dd>Roadmap</dd>
              </div>
              <div>
                <dt>Audio incluso</dt>
                <dd>No, mai automaticamente</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
