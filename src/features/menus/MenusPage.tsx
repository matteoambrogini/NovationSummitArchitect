import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fxModulationCatalog,
  modulationCatalog,
  parameterCatalog,
} from "../../domain/catalog";
import {
  completeMatrixSlots,
  formatParameterValue,
  getMenuNavigation,
  getScopePart,
  getSetting,
  isDefinitionVisible,
  isParameterValue,
} from "../../domain/patchUi";
import {
  selectActiveProposal,
  useAppStore,
} from "../../stores/useAppStore";

type MenuView = "oled" | "navigator" | "table" | "modulation";

const viewLabels: Array<[MenuView, string]> = [
  ["oled", "OLED"],
  ["navigator", "Menu Navigator"],
  ["table", "Parameter Table"],
  ["modulation", "Modulation"],
];

export function MenusPage() {
  const proposal = useAppStore(selectActiveProposal);
  const activeScope = useAppStore((state) => state.activeScope);
  const setActiveScope = useAppStore((state) => state.setActiveScope);
  const [view, setView] = useState<MenuView>("oled");
  const [selectedParameterId, setSelectedParameterId] = useState("osc.common.drift");

  const menuDefinitions = useMemo(
    () =>
      parameterCatalog.filter(
        (definition) =>
          definition.location.type === "menu" &&
          isDefinitionVisible(definition, activeScope),
      ),
    [activeScope],
  );

  if (!proposal) {
    return (
      <div className="empty-state">
        <span className="empty-icon">▤</span>
        <h1>Nessun menu da mostrare</h1>
        <p>Apri una demo per ottenere menu e matrici.</p>
        <Link className="button primary" to="/">Scegli una demo</Link>
      </div>
    );
  }

  const part = getScopePart(proposal, activeScope);
  const selectedDefinition =
    menuDefinitions.find((definition) => definition.id === selectedParameterId) ??
    menuDefinitions[0];
  const selectedSetting = selectedDefinition
    ? getSetting(proposal, selectedDefinition.id, activeScope)
    : undefined;
  const selectedValue =
    selectedSetting?.value ??
    (selectedDefinition && isParameterValue(selectedDefinition.defaultValue)
      ? selectedDefinition.defaultValue
      : undefined);
  const selectedDisplay =
    selectedDefinition && selectedValue !== undefined
      ? formatParameterValue(selectedDefinition, selectedValue)
      : "N/D";
  const navigation = selectedDefinition
    ? getMenuNavigation(selectedDefinition, selectedDisplay)
    : undefined;
  const samePage = selectedDefinition
    ? menuDefinitions
        .filter(
          (definition) =>
            definition.location.type === "menu" &&
            selectedDefinition.location.type === "menu" &&
            definition.location.menu === selectedDefinition.location.menu &&
            definition.location.page === selectedDefinition.location.page,
        )
        .sort((left, right) => {
          if (left.location.type !== "menu" || right.location.type !== "menu") return 0;
          return (left.location.row ?? 99) - (right.location.row ?? 99);
        })
    : [];
  const modSlots = completeMatrixSlots(part.modulationMatrix, "mod");
  const fxSlots = completeMatrixSlots(part.fxModulationMatrix, "fx");
  const modSourceById = new Map(
    modulationCatalog.sources.map((source) => [source.id, source.displayLabel]),
  );
  const modDestinationById = new Map(
    modulationCatalog.destinations.map((destination) => [
      destination.id,
      destination.displayLabel,
    ]),
  );
  const fxSourceById = new Map(
    fxModulationCatalog.sources.map((source) => [source.id, source.displayLabel]),
  );
  const fxDestinationById = new Map(
    fxModulationCatalog.destinations.map((destination) => [
      destination.id,
      destination.displayLabel,
    ]),
  );

  return (
    <div className="page menus-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow accent">DISPLAY & MENUS · CATALOG WORKSPACE</span>
          <h1>Display, percorsi e matrici</h1>
          <p>Valori, pagine, short label e stati di verifica arrivano dal catalogo firmware 2.1.</p>
        </div>
        <div className="panel-heading-actions">
          <div className="scope-switcher" aria-label="Scope patch">
            {(
              [
                ["single", "Single"],
                ["multi-a", "Multi A"],
                ["multi-b", "Multi B"],
              ] as const
            ).map(([scope, label]) => (
              <button
                key={scope}
                className={activeScope === scope ? "active" : ""}
                aria-pressed={activeScope === scope}
                onClick={() => setActiveScope(scope)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="badge">{menuDefinitions.length} parametri compatibili</span>
        </div>
      </header>

      <nav className="menu-view-tabs" aria-label="Modalità Display e menu">
        {viewLabels.map(([id, label]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            <span>{id === "oled" ? "▰" : id === "navigator" ? "➜" : id === "table" ? "▤" : "⌘"}</span>
            {label}
          </button>
        ))}
      </nav>

      {view === "oled" ? (
        <section className="display-workspace">
          <div className="oled-device large">
            <div className="oled-screen">
              <div className="oled-title">
                <span>{navigation?.menu.toUpperCase() ?? "MENU"}</span>
                <span>PAGE {String(navigation?.page ?? "—")}</span>
              </div>
              {samePage.slice(0, 4).map((definition) => {
                const setting = getSetting(proposal, definition.id, activeScope);
                const value =
                  setting?.value ??
                  (isParameterValue(definition.defaultValue)
                    ? definition.defaultValue
                    : undefined);
                return (
                  <button
                    key={definition.id}
                    className={definition.id === selectedDefinition?.id ? "active" : ""}
                    onClick={() => setSelectedParameterId(definition.id)}
                  >
                    <span>{definition.shortDisplayLabel ?? definition.label}</span>
                    <strong>
                      {value !== undefined ? formatParameterValue(definition, value) : "N/D"}
                    </strong>
                  </button>
                );
              })}
            </div>
            <div className="oled-controls" aria-hidden="true">
              <button>◀</button><button>▶</button><span className="encoder" />
            </div>
          </div>
          <article className="card oled-inspector">
            <span className="eyebrow">PARAMETRO ATTIVO</span>
            <h2>{selectedDefinition?.label ?? "—"}</h2>
            <strong className="oled-current-value">{selectedDisplay}</strong>
            <dl>
              <div><dt>Menu</dt><dd>{navigation?.menu ?? "—"}</dd></div>
              <div><dt>Pagina</dt><dd>{String(navigation?.page ?? "—")}</dd></div>
              <div><dt>Riga</dt><dd>{navigation?.row ?? "—"}</dd></div>
              <div><dt>Scope</dt><dd>{selectedDefinition?.scope ?? "—"}</dd></div>
            </dl>
            <button className="button subtle full" onClick={() => setView("navigator")}>
              Mostra percorso operativo →
            </button>
          </article>
        </section>
      ) : null}

      {view === "navigator" && navigation ? (
        <section className="navigator-workspace">
          <article className={`card navigation-guide${navigation.uncertainty ? " uncertain" : ""}`}>
            <span className="eyebrow">
              {navigation.uncertainty ? "! INCERTEZZA DOCUMENTATA" : "✓ NAVIGAZIONE VERIFICATA"}
            </span>
            <h2>{selectedDefinition?.label}</h2>
            {navigation.uncertainty ? (
              <>
                <p>
                  Il parametro è verificato, ma non viene proposto un percorso numerico certo:
                  le fonti ufficiali confliggono sul conteggio delle pagine.
                </p>
                <div className="uncertainty-note">{navigation.uncertainty}</div>
                <div className="key-path">
                  <kbd>{navigation.menu.toUpperCase()}</kbd>
                  <span>→</span>
                  <kbd>PAGINA DA VERIFICARE</kbd>
                  <span>→</span>
                  <kbd>{navigation.parameterLabel}</kbd>
                </div>
              </>
            ) : (
              <>
                <p className="operation-instruction">
                  Premi <strong>{navigation.menu.toUpperCase()}</strong> → pagina{" "}
                  <strong>{String(navigation.page)}</strong> →{" "}
                  <strong>{navigation.parameterLabel}</strong> →{" "}
                  <strong>{navigation.value}</strong>
                </p>
                <div className="key-path">
                  <kbd>{navigation.menu.toUpperCase()}</kbd>
                  <span>→</span>
                  <kbd>PAGE {String(navigation.page)}</kbd>
                  <span>→</span>
                  <kbd>{navigation.parameterLabel}</kbd>
                  <span>→</span>
                  <kbd>{navigation.value}</kbd>
                </div>
              </>
            )}
          </article>
          <aside className="card navigator-list">
            <span className="eyebrow">SCEGLI PARAMETRO</span>
            <input
              type="search"
              aria-label="Cerca parametro menu"
              placeholder="Cerca nel catalogo…"
              onChange={(event) => {
                const query = event.target.value.toLowerCase();
                const match = menuDefinitions.find(
                  (definition) =>
                    definition.label.toLowerCase().includes(query) ||
                    definition.id.toLowerCase().includes(query),
                );
                if (match) setSelectedParameterId(match.id);
              }}
            />
            <div className="navigator-shortcuts">
              {menuDefinitions.slice(0, 18).map((definition) => (
                <button
                  key={definition.id}
                  className={definition.id === selectedDefinition?.id ? "active" : ""}
                  onClick={() => setSelectedParameterId(definition.id)}
                >
                  <span>{definition.shortDisplayLabel ?? definition.label}</span>
                  <small>{definition.location.type === "menu" ? `${definition.location.menu} · p.${definition.location.page}` : ""}</small>
                </button>
              ))}
            </div>
          </aside>
        </section>
      ) : null}

      {view === "table" ? (
        <section className="card table-card">
          <div className="section-heading">
            <div><span className="eyebrow">PARAMETER TABLE</span><h2>Catalogo compatibile con {activeScope === "single" ? "Single" : activeScope === "multi-a" ? "Multi A" : "Multi B"}</h2></div>
            <span className="badge">{menuDefinitions.length} / {parameterCatalog.filter((definition) => definition.location.type === "menu").length}</span>
          </div>
          <div className="responsive-table parameter-table">
            <table>
              <thead><tr><th>Menu</th><th>Page</th><th>Parameter</th><th>Value</th><th>Verification</th><th>Source</th></tr></thead>
              <tbody>
                {menuDefinitions.map((definition) => {
                  if (definition.location.type !== "menu") return null;
                  const setting = getSetting(proposal, definition.id, activeScope);
                  const value =
                    setting?.value ??
                    (isParameterValue(definition.defaultValue)
                      ? definition.defaultValue
                      : undefined);
                  return (
                    <tr
                      key={definition.id}
                      className={definition.id === selectedDefinition?.id ? "selected" : ""}
                      onClick={() => setSelectedParameterId(definition.id)}
                    >
                      <td><strong>{definition.location.menu}</strong></td>
                      <td>{String(definition.location.page)}</td>
                      <td>{definition.label}<code>{definition.id}</code></td>
                      <td><strong>{value !== undefined ? formatParameterValue(definition, value) : "N/D"}</strong></td>
                      <td><span className={`verification-pill ${definition.verificationStatus}`}>{definition.verificationStatus === "verified" ? "✓" : "!"} {definition.verificationStatus}</span></td>
                      <td>
                        {definition.documentation.sourceUrl ? (
                          <a href={definition.documentation.sourceUrl} target="_blank" rel="noreferrer">
                            {definition.documentation.document}{definition.documentation.page ? ` · p.${definition.documentation.page}` : ""}
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "modulation" ? (
        <div className="matrix-workspace">
          <MatrixTable
            title="Mod Matrix"
            subtitle="16 slot per parte"
            slots={modSlots}
            sourceById={modSourceById}
            destinationById={modDestinationById}
          />
          <MatrixTable
            title="FX Mod Matrix"
            subtitle="4 slot per parte"
            slots={fxSlots}
            sourceById={fxSourceById}
            destinationById={fxDestinationById}
            fx
          />
        </div>
      ) : null}
    </div>
  );
}

function MatrixTable({
  title,
  subtitle,
  slots,
  sourceById,
  destinationById,
  fx = false,
}: {
  title: string;
  subtitle: string;
  slots: ReturnType<typeof completeMatrixSlots>;
  sourceById: ReadonlyMap<string, string>;
  destinationById: ReadonlyMap<string, string>;
  fx?: boolean;
}) {
  return (
    <section className="card table-card matrix-table">
      <div className="section-heading">
        <div><span className="eyebrow">{fx ? "FX MODULATION" : "SYNTH MODULATION"}</span><h2>{title}</h2></div>
        <span className="badge">{subtitle}</span>
      </div>
      <div className="responsive-table">
        <table>
          <thead><tr><th>Slot</th><th>Source A</th><th>Source B</th><th>Destination</th><th>Depth</th><th>State</th></tr></thead>
          <tbody>
            {slots.map((assignment) => {
              const active = assignment.depth !== 0;
              return (
                <tr key={assignment.slot} className={active ? "matrix-active" : "matrix-empty"}>
                  <td><span className={`slot-number${fx ? " purple" : ""}`}>{assignment.slot}</span></td>
                  <td>{sourceById.get(assignment.sourceA) ?? assignment.sourceA}</td>
                  <td>{sourceById.get(assignment.sourceB ?? "direct") ?? assignment.sourceB ?? "Direct"}</td>
                  <td><strong>{destinationById.get(assignment.destination) ?? assignment.destination}</strong></td>
                  <td><strong className={assignment.depth >= 0 ? "positive" : "negative"}>{assignment.depth > 0 ? "+" : ""}{assignment.depth}</strong></td>
                  <td><span className={`matrix-state ${active ? "active" : ""}`}>{active ? "◆ Attivo" : "◇ Default"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
