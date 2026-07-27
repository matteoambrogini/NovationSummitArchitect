import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { SummitPanel } from "../../components/SummitPanel";
import {
  panelRenderStats,
  summitPanelLayout,
} from "../../components/SummitPanelLayout";
import { parameterById } from "../../domain/catalog";
import { changedParameterIds } from "../../domain/patchDelta";
import { getScopePart, getSetting } from "../../domain/patchUi";
import {
  selectActiveProposal,
  selectIsDirty,
  useAppStore,
} from "../../stores/useAppStore";
import { ParameterInspector } from "./ParameterInspector";

const PANEL_WIDTH = 8800;
const PANEL_HEIGHT = 560;

export function PhysicalPanelPage() {
  const proposal = useAppStore(selectActiveProposal);
  const proposals = useAppStore((state) => state.proposals);
  const selectedParameterId = useAppStore((state) => state.selectedParameterId);
  const selectParameter = useAppStore((state) => state.selectParameter);
  const setParameterValue = useAppStore((state) => state.setParameterValue);
  const activeScope = useAppStore((state) => state.activeScope);
  const setActiveScope = useAppStore((state) => state.setActiveScope);
  const dirty = useAppStore(selectIsDirty);
  const setupMode = useAppStore((state) => state.setupMode);
  const setupStep = useAppStore((state) => state.setupStep);
  const setupOnlyModified = useAppStore((state) => state.setupOnlyModified);
  const toggleSetupMode = useAppStore((state) => state.toggleSetupMode);
  const nextSetupStep = useAppStore((state) => state.nextSetupStep);
  const previousSetupStep = useAppStore((state) => state.previousSetupStep);
  const skipSetupStep = useAppStore((state) => state.skipSetupStep);
  const toggleSetupOnlyModified = useAppStore(
    (state) => state.toggleSetupOnlyModified,
  );
  const viewport = useRef<HTMLDivElement>(null);
  const panStart = useRef<
    { pointerId: number; x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const [zoom, setZoom] = useState(0.62);
  const [focusedSectionId, setFocusedSectionId] = useState<string>();

  const baseline = proposals[0];
  const changedIds = useMemo(
    () => (proposal && baseline ? changedParameterIds(baseline, proposal) : []),
    [baseline, proposal],
  );
  const changedSet = useMemo(() => new Set(changedIds), [changedIds]);
  const setupSteps = useMemo(() => {
    if (!proposal) return [];
    if (!setupOnlyModified) return proposal.setupInstructions;
    return proposal.setupInstructions
      .map((step) => ({
        ...step,
        parameterIds: step.parameterIds.filter((parameterId) => {
          const setting = getSetting(proposal, parameterId, activeScope);
          const definition = parameterById.get(parameterId);
          return setting && setting.value !== definition?.defaultValue;
        }),
      }))
      .filter((step) => step.parameterIds.length > 0);
  }, [activeScope, proposal, setupOnlyModified]);
  const instruction =
    setupSteps.length > 0 ? setupSteps[setupStep % setupSteps.length] : undefined;

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
    setZoom(0.62);
    setFocusedSectionId(undefined);
    requestAnimationFrame(() => {
      if (viewport.current) {
        viewport.current.scrollLeft = 0;
        viewport.current.scrollTop = 0;
      }
    });
  };
  const focusSection = (sectionId: string) => {
    const section = summitPanelLayout.sections.find(
      (candidate) => candidate.id === sectionId,
    );
    if (!section) return;
    const width = viewport.current?.clientWidth ?? 1000;
    const nextZoom = Math.max(0.55, Math.min(1.35, (width - 50) / section.width));
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
    if ((event.target as Element).closest(".panel-control")) return;
    const current = viewport.current;
    if (!current) return;
    current.setPointerCapture(event.pointerId);
    panStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: current.scrollLeft,
      top: current.scrollTop,
    };
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const start = panStart.current;
    const current = viewport.current;
    if (!start || !current || start.pointerId !== event.pointerId) return;
    current.scrollLeft = start.left - (event.clientX - start.x);
    current.scrollTop = start.top - (event.clientY - start.y);
  };
  const finishPan = (event: PointerEvent<HTMLDivElement>) => {
    const current = viewport.current;
    if (current?.hasPointerCapture(event.pointerId)) {
      current.releasePointerCapture(event.pointerId);
    }
    panStart.current = undefined;
  };

  const part = getScopePart(proposal, activeScope);
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
          <span className="eyebrow accent">PHYSICAL PANEL · VECTOR WORKSPACE</span>
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
              SETUP MODE · {instruction?.area.toUpperCase() ?? "NESSUN VALORE DA IMPOSTARE"}
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
              <button className="tool-button text" onClick={fitPanel}>Fit panel</button>
              <button className="tool-button text" onClick={resetZoom}>Reset zoom</button>
              <select
                aria-label="Focus sezione"
                value={focusedSectionId ?? ""}
                onChange={(event) =>
                  event.target.value ? focusSection(event.target.value) : fitPanel()
                }
              >
                <option value="">Focus sezione…</option>
                {summitPanelLayout.sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.label}</option>
                ))}
              </select>
            </div>
            <div className="panel-state-legend" aria-label="Legenda stati">
              <span><i className="legend-shape default" /> default</span>
              <span><i className="legend-shape modified">◆</i> modificato</span>
              <span><i className="legend-shape suggested">✦</i> suggerito</span>
              <span><i className="legend-shape selected">◎</i> selezionato</span>
              <span><i className="legend-shape low">?</i> bassa conf.</span>
              <span><i className="legend-shape unavailable">×</i> non disponibile</span>
            </div>
          </div>
          <div
            ref={viewport}
            className="panel-viewport"
            onPointerDown={beginPan}
            onPointerMove={movePan}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
          >
            <div
              className="panel-canvas"
              style={{ width: PANEL_WIDTH * zoom, height: PANEL_HEIGHT * zoom }}
            >
              <div
                className="panel-scale"
                style={{
                  width: PANEL_WIDTH,
                  height: PANEL_HEIGHT,
                  transform: `scale(${zoom})`,
                }}
              >
                <SummitPanel
                  proposal={proposal}
                  scope={activeScope}
                  selectedParameterId={selectedParameterId}
                  changedIds={changedIds}
                  highlightedIds={setupMode ? instruction?.parameterIds ?? [] : []}
                  focusedSectionId={focusedSectionId}
                  onSelect={selectParameter}
                  onChange={setParameterValue}
                />
              </div>
            </div>
          </div>
          <div className="panel-caption">
            {panelRenderStats.total} controlli dal layout ufficiale ·{" "}
            {panelRenderStats.parameterBound} catalog-bound · trascina il fondo per il pan,
            i controlli verticalmente per modificarli.
          </div>
        </section>
        <ParameterInspector
          proposal={proposal}
          scope={activeScope}
          parameterId={selectedParameterId}
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
