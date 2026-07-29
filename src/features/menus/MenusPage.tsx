import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SummitOledScreen } from "../../components/SummitDisplay";
import {
  displayAreaById,
  displayStructure,
  fxModulationCatalog,
  modulationCatalog,
  parameterById,
} from "../../domain/catalog";
import {
  buildPatchSetupChecklist,
  isMatrixDisplayAreaId,
  patchDisplayAreas,
  type SetupFilter,
} from "../../domain/displayStructure";
import {
  completeMatrixSlots,
  formatParameterValue,
  getMenuNavigation,
  getScopePart,
  getSetting,
} from "../../domain/patchUi";
import { selectActiveProposal, useAppStore } from "../../stores/useAppStore";

type MenuView = "browser" | "checklist" | "modulation";

const viewLabels: Array<[MenuView, string, string]> = [
  ["browser", "Display browser", "▰"],
  ["checklist", "Patch checklist", "✓"],
  ["modulation", "Modulation", "⌘"],
];

export function MenusPage() {
  const proposal = useAppStore(selectActiveProposal);
  const activeScope = useAppStore((state) => state.activeScope);
  const setActiveScope = useAppStore((state) => state.setActiveScope);
  const selectedParameterId = useAppStore((state) => state.selectedParameterId);
  const activeDisplayAreaId = useAppStore((state) => state.activeDisplayAreaId);
  const activeDisplayPage = useAppStore((state) => state.activeDisplayPage);
  const selectedDisplayFieldId = useAppStore((state) => state.selectedDisplayFieldId);
  const activeModulationSlot = useAppStore((state) => state.activeModulationSlot);
  const activeFxModulationSlot = useAppStore((state) => state.activeFxModulationSlot);
  const selectDisplayArea = useAppStore((state) => state.selectDisplayArea);
  const setDisplayPage = useAppStore((state) => state.setDisplayPage);
  const selectDisplayField = useAppStore((state) => state.selectDisplayField);
  const setDisplaySlot = useAppStore((state) => state.setDisplaySlot);
  const [view, setView] = useState<MenuView>("browser");
  const [checklistFilter, setChecklistFilter] = useState<SetupFilter>("all");
  const [checklistOnlyModified, setChecklistOnlyModified] = useState(false);

  const selectedArea = displayAreaById.get(activeDisplayAreaId) ?? patchDisplayAreas[0]!;
  const selectedPage =
    selectedArea.kind === "pages"
      ? (selectedArea.pages.find((page) => page.page === activeDisplayPage) ??
        selectedArea.pages[0])
      : undefined;
  const selectedSlot =
    activeDisplayAreaId === "mod"
      ? activeModulationSlot
      : activeDisplayAreaId === "fx-mod"
        ? activeFxModulationSlot
        : undefined;
  const selectedField = (
    selectedArea.kind === "slots" ? selectedArea.slotFields : selectedPage?.fields
  )?.find((field) => field.id === selectedDisplayFieldId);

  const selectedDefinition = selectedParameterId
    ? parameterById.get(selectedParameterId)
    : undefined;
  const selectedSetting =
    proposal && selectedParameterId
      ? getSetting(proposal, selectedParameterId, activeScope)
      : undefined;
  const selectedValue =
    selectedDefinition && selectedSetting
      ? formatParameterValue(selectedDefinition, selectedSetting.value)
      : undefined;
  const navigation =
    selectedDefinition && selectedValue
      ? getMenuNavigation(selectedDefinition, selectedValue)
      : undefined;

  const checklist = useMemo(
    () =>
      proposal
        ? buildPatchSetupChecklist(proposal, activeScope, checklistFilter, checklistOnlyModified)
        : [],
    [activeScope, checklistFilter, checklistOnlyModified, proposal],
  );

  if (!proposal) {
    return (
      <div className="empty-state">
        <span className="empty-icon">▤</span>
        <h1>Nessun menu da mostrare</h1>
        <p>Apri una demo per ottenere display, checklist e matrici.</p>
        <Link className="button primary" to="/">
          Scegli una demo
        </Link>
      </div>
    );
  }

  const part = getScopePart(proposal, activeScope);
  const modSlots = completeMatrixSlots(part.modulationMatrix, "mod");
  const fxSlots = completeMatrixSlots(part.fxModulationMatrix, "fx");
  const modSourceById = new Map(
    modulationCatalog.sources.map((source) => [source.id, source.displayLabel]),
  );
  const modDestinationById = new Map(
    modulationCatalog.destinations.map((destination) => [destination.id, destination.displayLabel]),
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

  const changeDisplayPosition = (next: number) => {
    if (isMatrixDisplayAreaId(selectedArea.id)) {
      setDisplaySlot(selectedArea.id, next);
    } else {
      setDisplayPage(next);
    }
  };

  return (
    <div className="page menus-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow accent">DISPLAY & MENU · FIRMWARE 2.1 OBSERVED MAP</span>
          <h1>Display, percorsi e checklist</h1>
          <p>
            45 pagine osservate nell’intero video, 119 campi visibili e 20 slot di matrice. Pannello
            fisico, OLED, browser e Setup Mode condividono un unico stato di navigazione.
          </p>
        </div>
        <div className="panel-heading-actions">
          <ScopeSwitcher activeScope={activeScope} setActiveScope={setActiveScope} />
          <span className="badge">116 campi catalog-bound</span>
        </div>
      </header>

      <nav className="menu-view-tabs" aria-label="Modalità Display e menu">
        {viewLabels.map(([id, label, icon]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {view === "browser" ? (
        <section className="display-browser-workspace">
          <aside className="card display-area-browser">
            <span className="eyebrow">AREA BUTTON</span>
            <div className="display-area-list">
              {patchDisplayAreas.map((area) => (
                <button
                  key={area.id}
                  className={area.id === selectedArea.id ? "active" : ""}
                  onClick={() => selectDisplayArea(area.id)}
                >
                  <strong>{area.physicalButton}</strong>
                  <span>
                    {area.kind === "slots"
                      ? `${area.slotCount} slot`
                      : `${area.pages.length} pagine`}
                  </span>
                </button>
              ))}
            </div>
            <div className="global-settings-note">
              <strong>SETTINGS · globale</strong>
              <span>
                Il pulsante è visibile, ma il video non ne attraversa le pagine. Escluso dalla
                patch.
              </span>
            </div>
          </aside>

          <div className="oled-device summit-display-device">
            <SummitOledScreen
              proposal={proposal}
              scope={activeScope}
              area={selectedArea}
              page={selectedPage}
              activeSlot={selectedSlot}
              selectedDisplayFieldId={selectedDisplayFieldId}
              selectedParameterId={selectedParameterId}
              onFieldSelect={selectDisplayField}
            />
            <div className="oled-hardware-navigation">
              <button
                aria-label={selectedArea.kind === "slots" ? "Slot precedente" : "Pagina precedente"}
                disabled={
                  selectedArea.kind === "slots" ? (selectedSlot ?? 1) <= 1 : activeDisplayPage <= 1
                }
                onClick={() =>
                  changeDisplayPosition(
                    selectedArea.kind === "slots" ? (selectedSlot ?? 1) - 1 : activeDisplayPage - 1,
                  )
                }
              >
                {selectedArea.kind === "slots" ? "SLOT ◀" : "PAGE ◀"}
              </button>
              <span>
                {selectedArea.displayLabel} ·{" "}
                {selectedArea.kind === "slots"
                  ? `${selectedSlot ?? 1}/${selectedArea.slotCount}`
                  : `${activeDisplayPage}/${selectedArea.pages.length}`}
              </span>
              <button
                aria-label={selectedArea.kind === "slots" ? "Slot successivo" : "Pagina successiva"}
                disabled={
                  selectedArea.kind === "slots"
                    ? (selectedSlot ?? 1) >= (selectedArea.slotCount ?? 1)
                    : activeDisplayPage >= selectedArea.pages.length
                }
                onClick={() =>
                  changeDisplayPosition(
                    selectedArea.kind === "slots" ? (selectedSlot ?? 1) + 1 : activeDisplayPage + 1,
                  )
                }
              >
                {selectedArea.kind === "slots" ? "SLOT ▶" : "PAGE ▶"}
              </button>
            </div>
            <div
              className="display-page-dots"
              aria-label={
                selectedArea.kind === "slots"
                  ? `Slot ${selectedSlot ?? 1} di ${selectedArea.slotCount}`
                  : `Pagina ${activeDisplayPage} di ${selectedArea.pages.length}`
              }
            >
              {(selectedArea.kind === "slots"
                ? Array.from({ length: selectedArea.slotCount ?? 0 }, (_, index) => index + 1)
                : selectedArea.pages.map((page) => page.page)
              ).map((position) => (
                <button
                  key={position}
                  aria-label={`${selectedArea.kind === "slots" ? "Slot" : "Pagina"} ${position}`}
                  className={
                    position === (selectedArea.kind === "slots" ? selectedSlot : activeDisplayPage)
                      ? "active"
                      : ""
                  }
                  onClick={() => changeDisplayPosition(position)}
                />
              ))}
            </div>
          </div>

          <article className="card operational-path">
            <span className="eyebrow">
              {navigation ? "PERCORSO OPERATIVO GENERATO" : "CAMPO NON ASSOCIATO"}
            </span>
            <h2>
              {selectedDefinition?.label ??
                selectedField?.displayLabel ??
                selectedPage?.displayTitle ??
                selectedArea.displayLabel}
            </h2>
            {navigation ? (
              <>
                <p className="operation-instruction">
                  Premi <strong>{navigation.menu.toUpperCase()}</strong>
                  {navigation.pageRightPresses ? (
                    <>
                      {" "}
                      → <strong>PAGE ▶ × {navigation.pageRightPresses}</strong>
                    </>
                  ) : (
                    <>
                      {" "}
                      → <strong>pagina iniziale</strong>
                    </>
                  )}{" "}
                  → riga <strong>{navigation.row}</strong> →{" "}
                  <strong>{navigation.parameterLabel}</strong> → <strong>{navigation.value}</strong>
                </p>
                <div className="key-path">
                  <kbd>{navigation.menu.toUpperCase()}</kbd>
                  <span>→</span>
                  <kbd>
                    {navigation.pageRightPresses
                      ? `PAGE ▶ × ${navigation.pageRightPresses}`
                      : "PAGE 1"}
                  </kbd>
                  <span>→</span>
                  <kbd>{navigation.parameterLabel}</kbd>
                  <span>→</span>
                  <kbd>{navigation.value}</kbd>
                </div>
                <dl>
                  <div>
                    <dt>Area</dt>
                    <dd>{navigation.areaId}</dd>
                  </div>
                  <div>
                    <dt>Pagina</dt>
                    <dd>
                      {String(navigation.page)} / {navigation.pageCount ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Riga</dt>
                    <dd>{navigation.row ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{selectedDefinition?.scope ?? "—"}</dd>
                  </div>
                </dl>
              </>
            ) : selectedArea.kind === "slots" ? (
              <p>
                {selectedArea.displayLabel} · slot {selectedSlot ?? 1} · campo{" "}
                <strong>{selectedField?.displayLabel ?? "Source A"}</strong>. La stessa selezione è
                attiva sul display incorporato e sul Value encoder del pannello fisico.
              </p>
            ) : (
              <p>
                Seleziona un campo catalog-bound. I campi Wave/Save di USER WAVES e Status di CLOCK
                restano visibili ma non vengono trasformati in parametri patch.
              </p>
            )}
            <button className="button subtle full" onClick={() => setView("checklist")}>
              Apri la checklist completa →
            </button>
          </article>
        </section>
      ) : null}

      {view === "checklist" ? (
        <section className="card checklist-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PATCH CHECKLIST</span>
              <h2>
                {proposal.patch.name} ·{" "}
                {activeScope === "single"
                  ? "Single"
                  : activeScope === "multi-a"
                    ? "Multi A"
                    : "Multi B"}
              </h2>
            </div>
            <span className="badge">{checklist.length} passaggi</span>
          </div>
          <div className="checklist-toolbar">
            <div className="setup-kind-filter" aria-label="Filtro checklist">
              {(
                [
                  ["all", "Tutto"],
                  ["physical", "Controlli fisici"],
                  ["menu", "Menu / matrici"],
                ] as Array<[SetupFilter, string]>
              ).map(([filter, label]) => (
                <button
                  key={filter}
                  className={checklistFilter === filter ? "active" : ""}
                  aria-pressed={checklistFilter === filter}
                  onClick={() => setChecklistFilter(filter)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="setup-filter">
              <input
                type="checkbox"
                checked={checklistOnlyModified}
                onChange={(event) => setChecklistOnlyModified(event.target.checked)}
              />
              Solo valori diversi dal default
            </label>
          </div>
          <ol className="patch-checklist">
            {checklist.map((item) => (
              <li key={item.id} className={item.modified ? "modified" : ""}>
                <span className={`checklist-kind ${item.kind}`}>
                  {item.kind === "physical" ? "PANEL" : "MENU"}
                </span>
                <div>
                  <strong>
                    {item.area}
                    {item.page ? ` · p.${item.page}` : item.slot ? ` · slot ${item.slot}` : ""}
                  </strong>
                  <p>{item.instruction}</p>
                </div>
                <span className="checklist-state">{item.modified ? "◆" : "◇"}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {view === "modulation" ? (
        <div className="matrix-workspace">
          <MatrixTable
            title="Mod Matrix"
            subtitle="16 slot completi per parte"
            slots={modSlots}
            sourceById={modSourceById}
            destinationById={modDestinationById}
            activeSlot={activeModulationSlot}
            onSelectSlot={(slot) => setDisplaySlot("mod", slot)}
          />
          <MatrixTable
            title="FX Mod Matrix"
            subtitle="4 slot completi per parte"
            slots={fxSlots}
            sourceById={fxSourceById}
            destinationById={fxDestinationById}
            activeSlot={activeFxModulationSlot}
            onSelectSlot={(slot) => setDisplaySlot("fx-mod", slot)}
            fx
          />
        </div>
      ) : null}

      <footer className="display-source-footer">
        Struttura: {displayStructure.documentation.document} ·{" "}
        {displayStructure.documentation.section} · verificata{" "}
        {displayStructure.documentation.verifiedAt}. Le discrepanze con i conteggi precedenti sono
        documentate, non nascoste.
      </footer>
    </div>
  );
}

function ScopeSwitcher({
  activeScope,
  setActiveScope,
}: {
  activeScope: "single" | "multi-a" | "multi-b";
  setActiveScope: (scope: "single" | "multi-a" | "multi-b") => void;
}) {
  return (
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
  );
}

function MatrixTable({
  title,
  subtitle,
  slots,
  sourceById,
  destinationById,
  activeSlot,
  onSelectSlot,
  fx = false,
}: {
  title: string;
  subtitle: string;
  slots: ReturnType<typeof completeMatrixSlots>;
  sourceById: ReadonlyMap<string, string>;
  destinationById: ReadonlyMap<string, string>;
  activeSlot: number;
  onSelectSlot: (slot: number) => void;
  fx?: boolean;
}) {
  return (
    <section className="card table-card matrix-table">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{fx ? "FX MODULATION" : "SYNTH MODULATION"}</span>
          <h2>{title}</h2>
        </div>
        <span className="badge">{subtitle}</span>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Source A</th>
              <th>Source B</th>
              <th>Destination</th>
              <th>Depth</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((assignment) => {
              const active = assignment.depth !== 0;
              return (
                <tr
                  key={assignment.slot}
                  className={[
                    active ? "matrix-active" : "matrix-empty",
                    activeSlot === assignment.slot ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onSelectSlot(assignment.slot)}
                >
                  <td>
                    <span className={`slot-number${fx ? " purple" : ""}`}>{assignment.slot}</span>
                  </td>
                  <td>{sourceById.get(assignment.sourceA) ?? assignment.sourceA}</td>
                  <td>
                    {sourceById.get(assignment.sourceB ?? "direct") ??
                      assignment.sourceB ??
                      "Direct"}
                  </td>
                  <td>
                    <strong>
                      {destinationById.get(assignment.destination) ?? assignment.destination}
                    </strong>
                  </td>
                  <td>
                    <strong className={assignment.depth >= 0 ? "positive" : "negative"}>
                      {assignment.depth > 0 ? "+" : ""}
                      {assignment.depth}
                    </strong>
                  </td>
                  <td>
                    <span className={`matrix-state ${active ? "active" : ""}`}>
                      {active ? "◆ Attivo" : "◇ Default"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
