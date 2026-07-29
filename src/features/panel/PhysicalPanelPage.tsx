import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { SummitPanel } from "../../components/SummitPanel";
import { panelRenderStats, summitPanelLayout } from "../../components/SummitPanelLayout";
import { stepControlValue } from "../../components/panel-controls/controlMath";
import { displayAreaById, parameterById } from "../../domain/catalog";
import {
  buildPatchSetupChecklist,
  isMatrixDisplayAreaId,
  isMatrixDisplayFieldId,
  stepMatrixFieldValue,
  type SetupFilter,
} from "../../domain/displayStructure";
import { changedParameterIds } from "../../domain/patchDelta";
import { getScopePart, getSetting } from "../../domain/patchUi";
import { copy } from "../../i18n/it";
import { selectActiveProposal, selectIsDirty, useAppStore } from "../../stores/useAppStore";
import { ParameterInspector } from "./ParameterInspector";

const PANEL_WIDTH = 1536;
const PANEL_HEIGHT = 539;

export function PhysicalPanelPage() {
  const proposal = useAppStore(selectActiveProposal);
  const proposals = useAppStore((state) => state.proposals);
  const selectedParameterId = useAppStore((state) => state.selectedParameterId);
  const selectParameter = useAppStore((state) => state.selectParameter);
  const activeDisplayAreaId = useAppStore((state) => state.activeDisplayAreaId);
  const activeDisplayPage = useAppStore((state) => state.activeDisplayPage);
  const selectedDisplayFieldId = useAppStore((state) => state.selectedDisplayFieldId);
  const activeModulationSlot = useAppStore((state) => state.activeModulationSlot);
  const activeFxModulationSlot = useAppStore((state) => state.activeFxModulationSlot);
  const activeGlobalLfo = useAppStore((state) => state.activeGlobalLfo);
  const setActiveGlobalLfo = useAppStore((state) => state.setActiveGlobalLfo);
  const selectDisplayArea = useAppStore((state) => state.selectDisplayArea);
  const stepDisplayPage = useAppStore((state) => state.stepDisplayPage);
  const selectDisplayField = useAppStore((state) => state.selectDisplayField);
  const setDisplaySlot = useAppStore((state) => state.setDisplaySlot);
  const stepDisplaySlot = useAppStore((state) => state.stepDisplaySlot);
  const setMatrixFieldValue = useAppStore((state) => state.setMatrixFieldValue);
  const setParameterValue = useAppStore((state) => state.setParameterValue);
  const activeScope = useAppStore((state) => state.activeScope);
  const setActiveScope = useAppStore((state) => state.setActiveScope);
  const dirty = useAppStore(selectIsDirty);
  const setupMode = useAppStore((state) => state.setupMode);
  const setupStep = useAppStore((state) => state.setupStep);
  const setupOnlyModified = useAppStore((state) => state.setupOnlyModified);
  const setupFilter = useAppStore((state) => state.setupFilter);
  const toggleSetupMode = useAppStore((state) => state.toggleSetupMode);
  const nextSetupStep = useAppStore((state) => state.nextSetupStep);
  const previousSetupStep = useAppStore((state) => state.previousSetupStep);
  const skipSetupStep = useAppStore((state) => state.skipSetupStep);
  const toggleSetupOnlyModified = useAppStore((state) => state.toggleSetupOnlyModified);
  const setSetupFilter = useAppStore((state) => state.setSetupFilter);
  const viewport = useRef<HTMLDivElement>(null);
  const panStart = useRef<
    { pointerId: number; x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const [zoom, setZoom] = useState(0.6);
  const [focusedSectionId, setFocusedSectionId] = useState<string>();
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [activeControlInteraction, setActiveControlInteraction] = useState<string>();
  const activeControlPointerId = useRef<number | undefined>(undefined);
  const spacePressed = useRef(false);
  const [panning, setPanning] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [calibrationPhoto, setCalibrationPhoto] = useState(true);
  const [calibrationVector, setCalibrationVector] = useState(true);
  const [calibrationGrid, setCalibrationGrid] = useState(false);
  const [calibrationCrosshairVisible, setCalibrationCrosshairVisible] = useState(true);
  const [calibrationCenters, setCalibrationCenters] = useState(true);
  const [calibrationOpacity, setCalibrationOpacity] = useState(0.5);
  const [calibrationCrosshair, setCalibrationCrosshair] = useState({
    x: PANEL_WIDTH / 2,
    y: PANEL_HEIGHT / 2,
  });

  const baseline = proposals[0];
  const changedIds = useMemo(
    () => (proposal && baseline ? changedParameterIds(baseline, proposal) : []),
    [baseline, proposal],
  );
  const changedSet = useMemo(() => new Set(changedIds), [changedIds]);
  const setupSteps = useMemo(() => {
    if (!proposal) return [];
    return buildPatchSetupChecklist(proposal, activeScope, setupFilter, setupOnlyModified);
  }, [activeScope, proposal, setupFilter, setupOnlyModified]);
  const instruction = setupSteps.length > 0 ? setupSteps[setupStep % setupSteps.length] : undefined;
  const setupParameterId = instruction?.parameterIds[0];
  const effectiveSelectedParameterId =
    setupMode && setupParameterId ? setupParameterId : selectedParameterId;

  useEffect(() => {
    if (!setupMode || !instruction) return;
    if (instruction.slot && (instruction.areaId === "mod" || instruction.areaId === "fx-mod")) {
      setDisplaySlot(instruction.areaId, instruction.slot);
      return;
    }
    if (setupParameterId) selectParameter(setupParameterId);
  }, [instruction, selectParameter, setDisplaySlot, setupMode, setupParameterId]);

  useEffect(() => {
    const endControlInteraction = () => {
      activeControlPointerId.current = undefined;
      setActiveControlInteraction(undefined);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        event.code === "Space" &&
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLSelectElement) &&
        !(target instanceof HTMLButtonElement)
      ) {
        event.preventDefault();
        spacePressed.current = true;
      }
    };
    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.code === "Space") spacePressed.current = false;
    };
    const onWindowBlur = () => {
      const activePan = panStart.current;
      if (activePan && viewport.current?.hasPointerCapture(activePan.pointerId)) {
        viewport.current.releasePointerCapture(activePan.pointerId);
      }
      spacePressed.current = false;
      panStart.current = undefined;
      setPanning(false);
      endControlInteraction();
    };
    window.addEventListener("pointerup", endControlInteraction, true);
    window.addEventListener("pointercancel", endControlInteraction, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onWindowBlur);
    return () => {
      window.removeEventListener("pointerup", endControlInteraction, true);
      window.removeEventListener("pointercancel", endControlInteraction, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onWindowBlur);
    };
  }, []);

  if (!proposal) {
    return (
      <div className="empty-state">
        <span className="empty-icon">◉</span>
        <h1>Nessuna patch da visualizzare</h1>
        <p>Apri una demo per popolare pannello, menu e modulazioni.</p>
        <Link className="button primary" to="/">
          Scegli una demo
        </Link>
      </div>
    );
  }

  const fitPanel = () => {
    const width = viewport.current?.clientWidth ?? 1200;
    const nextZoom = Math.max(0.1, Math.min(1, (width - 20) / PANEL_WIDTH));
    setZoom(nextZoom);
    setFocusedSectionId(undefined);
    requestAnimationFrame(() => {
      if (viewport.current) {
        viewport.current.scrollLeft = 0;
        viewport.current.scrollTop = 0;
      }
    });
  };
  const resetZoom = () => {
    setZoom(0.6);
    setFocusedSectionId(undefined);
    requestAnimationFrame(() => {
      if (viewport.current) {
        viewport.current.scrollLeft = 0;
        viewport.current.scrollTop = 0;
      }
    });
  };
  const focusSection = (sectionId: string) => {
    const section = summitPanelLayout.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const width = viewport.current?.clientWidth ?? 1000;
    const nextZoom = Math.max(0.8, Math.min(2.2, (width - 50) / section.width));
    setZoom(nextZoom);
    setFocusedSectionId(section.id);
    requestAnimationFrame(() => {
      if (viewport.current) {
        viewport.current.scrollLeft = Math.max(0, section.x * nextZoom - 24);
        viewport.current.scrollTop = Math.max(0, section.y * nextZoom - 24);
      }
    });
  };
  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (
      activeControlInteraction ||
      target.closest(".panel-control, .hardware-control, .panel-display-cluster")
    ) {
      return;
    }
    const explicitPanGesture = event.button === 1 || (event.button === 0 && spacePressed.current);
    if (!explicitPanGesture) return;
    const current = viewport.current;
    if (!current) return;
    event.preventDefault();
    event.stopPropagation();
    current.setPointerCapture(event.pointerId);
    panStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: current.scrollLeft,
      top: current.scrollTop,
    };
    setPanning(true);
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const start = panStart.current;
    const current = viewport.current;
    if (activeControlInteraction || !start || !current || start.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    current.scrollLeft = start.left - (event.clientX - start.x);
    current.scrollTop = start.top - (event.clientY - start.y);
  };
  const finishPan = (event: PointerEvent<HTMLDivElement>) => {
    if (panStart.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const current = viewport.current;
    if (current?.hasPointerCapture(event.pointerId)) {
      current.releasePointerCapture(event.pointerId);
    }
    panStart.current = undefined;
    setPanning(false);
  };
  const trackControlPointer = (event: PointerEvent<HTMLDivElement>) => {
    const target = (event.target as Element).closest<SVGElement>(
      ".panel-control, .hardware-control[role='button'], .oled-svg-row.selectable",
    );
    if (!target || event.button !== 0) return;
    activeControlPointerId.current = event.pointerId;
    setActiveControlInteraction(
      target.dataset.parameterId ??
        target.dataset.controlId ??
        target.dataset.displayFieldId ??
        "control",
    );
  };
  const releaseControlPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (activeControlPointerId.current !== event.pointerId) return;
    activeControlPointerId.current = undefined;
    setActiveControlInteraction(undefined);
  };
  const updateCalibrationCrosshair = (event: PointerEvent<HTMLDivElement>) => {
    if (!import.meta.env.DEV || !calibrationOpen) return;
    const svg = viewport.current?.querySelector<SVGSVGElement>(".summit-panel");
    const bounds = svg?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;
    setCalibrationCrosshair({
      x: Math.max(
        0,
        Math.min(PANEL_WIDTH, ((event.clientX - bounds.left) / bounds.width) * PANEL_WIDTH),
      ),
      y: Math.max(
        0,
        Math.min(PANEL_HEIGHT, ((event.clientY - bounds.top) / bounds.height) * PANEL_HEIGHT),
      ),
    });
  };

  const part = getScopePart(proposal, activeScope);
  const activeDisplayArea = displayAreaById.get(activeDisplayAreaId);
  const activeDisplayPageDefinition =
    activeDisplayArea?.kind === "pages"
      ? activeDisplayArea.pages.find((page) => page.page === activeDisplayPage)
      : undefined;
  const activeDisplayFields =
    activeDisplayArea?.kind === "slots"
      ? (activeDisplayArea.slotFields ?? [])
      : (activeDisplayPageDefinition?.fields ?? []);
  const activeDisplayField = activeDisplayFields.find(
    (field) => field.id === selectedDisplayFieldId,
  );
  const stepDisplayValue = (steps: number) => {
    if (!activeDisplayField || steps === 0) return;
    const direction: -1 | 1 = steps > 0 ? 1 : -1;
    const multiplier = Math.abs(steps);
    if (
      activeDisplayArea &&
      isMatrixDisplayAreaId(activeDisplayArea.id) &&
      isMatrixDisplayFieldId(activeDisplayField.id)
    ) {
      const slot = activeDisplayArea.id === "mod" ? activeModulationSlot : activeFxModulationSlot;
      const fieldId = activeDisplayField.id;
      const next = stepMatrixFieldValue(
        proposal,
        activeScope,
        activeDisplayArea.id,
        slot,
        fieldId,
        direction,
        multiplier,
      );
      setMatrixFieldValue(activeDisplayArea.id, slot, fieldId, next);
      return;
    }
    if (!activeDisplayField.parameterId) return;
    const definition = parameterById.get(activeDisplayField.parameterId);
    const setting = getSetting(proposal, activeDisplayField.parameterId, activeScope);
    if (!definition || !setting || definition.scope === "global") return;
    setParameterValue(
      activeDisplayField.parameterId,
      stepControlValue(definition, setting.value, direction, multiplier),
    );
  };
  const jsonPreview = JSON.stringify(
    {
      patch: proposal.patch,
      targetFirmware: proposal.targetFirmware,
      scope: activeScope,
      values: Object.fromEntries(
        [...part.panelControls, ...part.menuSettings].map((setting) => [
          setting.parameterId,
          setting.value,
        ]),
      ),
    },
    null,
    2,
  );

  return (
    <div className="page panel-page">
      <header className="page-heading panel-heading">
        <div>
          <span className="eyebrow accent">PHYSICAL PANEL · OPERATIONAL HARDWARE MAP</span>
          <h1>{proposal.patch.name}</h1>
          <p>{proposal.patch.description}</p>
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
          <span className={`dirty-badge${dirty ? " dirty" : ""}`}>
            {dirty ? "◆ MODIFICATA" : "◇ SALVATA"}
          </span>
          <button
            className={`button ${setupMode ? "primary" : "subtle"}`}
            onClick={toggleSetupMode}
          >
            {setupMode ? "Chiudi Setup Mode" : "Configura il Summit"}
          </button>
        </div>
      </header>

      {setupMode ? (
        <section className="setup-banner" aria-label="Setup Mode">
          <div className="step-number">
            {instruction ? String((setupStep % setupSteps.length) + 1).padStart(2, "0") : "—"}
          </div>
          <div className="setup-copy">
            <span className="eyebrow">
              SETUP MODE · {instruction?.kind === "menu" ? "DISPLAY" : "PANNELLO"} ·{" "}
              {instruction?.area.toUpperCase() ?? "NESSUN VALORE DA IMPOSTARE"}
            </span>
            <strong>
              {instruction?.instruction ??
                "Tutti i controlli inclusi nel filtro sono già al valore predefinito."}
            </strong>
            <label className="setup-filter">
              <input
                type="checkbox"
                checked={setupOnlyModified}
                onChange={toggleSetupOnlyModified}
              />
              Solo valori diversi dal default
            </label>
            <div className="setup-kind-filter" aria-label="Filtro passaggi Setup Mode">
              {(
                [
                  ["all", "Tutto"],
                  ["physical", "Controlli fisici"],
                  ["menu", "Menu / matrici"],
                ] as Array<[SetupFilter, string]>
              ).map(([filter, label]) => (
                <button
                  key={filter}
                  className={setupFilter === filter ? "active" : ""}
                  aria-pressed={setupFilter === filter}
                  onClick={() => setSetupFilter(filter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="setup-actions">
            <button className="button subtle" onClick={previousSetupStep} disabled={!instruction}>
              ← Precedente
            </button>
            <button className="button subtle" onClick={skipSetupStep} disabled={!instruction}>
              Salta
            </button>
            <button className="button primary" onClick={nextSetupStep} disabled={!instruction}>
              Successivo →
            </button>
          </div>
        </section>
      ) : null}

      <div className="panel-layout">
        <section className="card panel-card">
          <div className="panel-toolbar">
            <div className="panel-tool-group">
              <output
                className={`panel-interaction-mode${panning ? " panning" : ""}`}
                aria-label={copy.panel.interactionMode}
                data-active-control={activeControlInteraction}
              >
                {panning
                  ? copy.panel.pan
                  : activeControlInteraction
                    ? copy.panel.control
                    : copy.panel.interact}
              </output>
              <button
                className="tool-button"
                aria-label="Riduci zoom"
                onClick={() => setZoom((value) => Math.max(0.1, value - 0.1))}
              >
                −
              </button>
              <output aria-label="Livello zoom">{Math.round(zoom * 100)}%</output>
              <button
                className="tool-button"
                aria-label="Aumenta zoom"
                onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}
              >
                +
              </button>
              <button className="tool-button text" onClick={fitPanel}>
                Fit panel
              </button>
              <button className="tool-button text" onClick={resetZoom}>
                Reset zoom
              </button>
              <button
                className="tool-button text"
                aria-label="Zoom 125%"
                onClick={() => setZoom(1.25)}
              >
                125%
              </button>
              <button
                className="tool-button text"
                aria-label="Zoom 150%"
                onClick={() => setZoom(1.5)}
              >
                150%
              </button>
              <button
                className={`tool-button text${showInfoOverlay ? " active" : ""}`}
                aria-pressed={showInfoOverlay}
                onClick={() => setShowInfoOverlay((value) => !value)}
              >
                {showInfoOverlay ? "Nascondi overlay" : "Mostra overlay"}
              </button>
              <select
                aria-label="Focus sezione"
                value={focusedSectionId ?? ""}
                onChange={(event) =>
                  event.target.value ? focusSection(event.target.value) : fitPanel()
                }
              >
                <option value="">Focus sezione…</option>
                {summitPanelLayout.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
              {import.meta.env.DEV ? (
                <button
                  className={`tool-button text${calibrationOpen ? " active" : ""}`}
                  aria-pressed={calibrationOpen}
                  onClick={() => setCalibrationOpen((value) => !value)}
                >
                  {calibrationOpen ? copy.panel.calibrationClose : copy.panel.calibrationOpen}
                </button>
              ) : null}
            </div>
            <div className="panel-state-legend" aria-label="Legenda stati">
              <span>
                <i className="legend-shape default" /> default
              </span>
              <span>
                <i className="legend-shape modified">◆</i> modificato
              </span>
              <span>
                <i className="legend-shape suggested">✦</i> suggerito
              </span>
              <span>
                <i className="legend-shape selected">◎</i> selezionato
              </span>
              <span>
                <i className="legend-shape low">?</i> bassa conf.
              </span>
              <span>
                <i className="legend-shape unavailable">×</i> non disponibile
              </span>
            </div>
          </div>
          {import.meta.env.DEV && calibrationOpen ? (
            <div
              className="panel-calibration-toolbar"
              role="region"
              aria-label={copy.panel.calibration}
            >
              <label>
                <input
                  type="checkbox"
                  checked={calibrationPhoto}
                  onChange={(event) => setCalibrationPhoto(event.target.checked)}
                />
                {copy.panel.referencePhoto}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={calibrationVector}
                  onChange={(event) => setCalibrationVector(event.target.checked)}
                />
                {copy.panel.vectorPanel}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={calibrationGrid}
                  onChange={(event) => setCalibrationGrid(event.target.checked)}
                />
                {copy.panel.grid}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={calibrationCrosshairVisible}
                  onChange={(event) => setCalibrationCrosshairVisible(event.target.checked)}
                />
                {copy.panel.crosshair}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={calibrationCenters}
                  onChange={(event) => setCalibrationCenters(event.target.checked)}
                />
                {copy.panel.controlCenters}
              </label>
              <label className="calibration-opacity">
                {copy.panel.photoOpacity}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={calibrationOpacity}
                  onChange={(event) => setCalibrationOpacity(event.target.valueAsNumber)}
                />
                <output>{Math.round(calibrationOpacity * 100)}%</output>
              </label>
              <code>
                x {Math.round(calibrationCrosshair.x)} · y {Math.round(calibrationCrosshair.y)}
              </code>
            </div>
          ) : null}
          <div
            ref={viewport}
            className={`panel-viewport${panning ? " is-panning" : ""}`}
            data-interaction-mode={
              panning
                ? copy.panel.pan
                : activeControlInteraction
                  ? copy.panel.control
                  : copy.panel.interact
            }
            data-active-control-interaction={activeControlInteraction}
            aria-description={copy.panel.panHint}
            onPointerDownCapture={trackControlPointer}
            onPointerUpCapture={releaseControlPointer}
            onPointerCancelCapture={releaseControlPointer}
            onPointerDown={beginPan}
            onPointerMove={(event) => {
              updateCalibrationCrosshair(event);
              movePan(event);
            }}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
            onLostPointerCapture={() => {
              panStart.current = undefined;
              setPanning(false);
            }}
          >
            <div
              className="panel-canvas"
              style={{ width: PANEL_WIDTH * zoom, height: PANEL_HEIGHT * zoom }}
            >
              <div
                className="panel-scale"
                style={{
                  width: PANEL_WIDTH * zoom,
                  height: PANEL_HEIGHT * zoom,
                }}
              >
                <SummitPanel
                  proposal={proposal}
                  scope={activeScope}
                  selectedParameterId={effectiveSelectedParameterId}
                  activeDisplayAreaId={activeDisplayAreaId}
                  activeDisplayPage={activeDisplayPage}
                  selectedDisplayFieldId={selectedDisplayFieldId}
                  activeModulationSlot={activeModulationSlot}
                  activeFxModulationSlot={activeFxModulationSlot}
                  activeGlobalLfo={activeGlobalLfo}
                  changedIds={changedIds}
                  highlightedIds={setupMode ? (instruction?.parameterIds ?? []) : []}
                  highlightedAreaId={
                    setupMode && instruction?.kind === "menu" ? instruction.areaId : undefined
                  }
                  focusedSectionId={focusedSectionId}
                  showInfoOverlay={showInfoOverlay}
                  calibration={
                    import.meta.env.DEV && calibrationOpen
                      ? {
                          showPhoto: calibrationPhoto,
                          showVector: calibrationVector,
                          showGrid: calibrationGrid,
                          showCrosshair: calibrationCrosshairVisible,
                          showControlCenters: calibrationCenters,
                          photoOpacity: calibrationOpacity,
                          crosshair: calibrationCrosshair,
                        }
                      : undefined
                  }
                  onSelect={selectParameter}
                  onChange={setParameterValue}
                  onDisplayAreaSelect={selectDisplayArea}
                  onDisplayStep={(direction) => {
                    if (isMatrixDisplayAreaId(activeDisplayAreaId)) {
                      stepDisplaySlot(direction);
                    } else {
                      stepDisplayPage(direction);
                    }
                  }}
                  onDisplayFieldSelect={selectDisplayField}
                  onDisplayValueStep={stepDisplayValue}
                  onGlobalLfoSelect={setActiveGlobalLfo}
                />
              </div>
            </div>
          </div>
          <div className="panel-caption">
            {panelRenderStats.total} controlli registrati · {panelRenderStats.parameterBindings}{" "}
            binding di parametro · {panelRenderStats.physicalElements} elementi inclusi contando 61
            tasti e 2 wheel. Valori e stati restano nell’overlay informativo; la vista hardware
            conserva la serigrafia fisica.
          </div>
        </section>
        <ParameterInspector
          proposal={proposal}
          scope={activeScope}
          parameterId={effectiveSelectedParameterId}
        />
      </div>

      <details className="card patch-json">
        <summary>
          Patch JSON sincronizzato <span>{changedSet.size} valori modificati</span>
        </summary>
        <pre data-testid="patch-json">{jsonPreview}</pre>
      </details>
    </div>
  );
}
