import {
  catalogTarget,
  midiMappingsByParameterId,
  parameterById,
} from "../../domain/catalog";
import {
  formatParameterValue,
  getSetting,
  isParameterValue,
  type PatchScope,
} from "../../domain/patchUi";
import type { SummitPatchProposal } from "../../domain/schemas";
import { useAppStore } from "../../stores/useAppStore";

export function ParameterInspector({
  proposal,
  scope,
  parameterId,
}: {
  proposal: SummitPatchProposal;
  scope: PatchScope;
  parameterId: string | undefined;
}) {
  const setParameterValue = useAppStore((state) => state.setParameterValue);
  const definition = parameterId ? parameterById.get(parameterId) : undefined;
  const setting =
    parameterId && definition ? getSetting(proposal, parameterId, scope) : undefined;

  if (!definition) {
    return (
      <aside className="card inspector empty">
        <span className="eyebrow">PARAMETER INSPECTOR</span>
        <p>Seleziona un controllo per vedere binding, dominio, firmware e fonte.</p>
      </aside>
    );
  }

  const menuLocations = [
    definition.location,
    ...(definition.alternateLocations ?? []),
  ].filter((location) => location.type === "menu");
  const panelLocations = [
    definition.location,
    ...(definition.alternateLocations ?? []),
  ].filter((location) => location.type === "panel");
  const mappings = midiMappingsByParameterId.get(definition.id) ?? [];
  const verifiedMappings = mappings.filter(
    (mapping) =>
      mapping.verificationStatus === "verified" &&
      mapping.translation.verificationStatus === "verified",
  );
  const firmware = definition.introducedInFirmware
    ? `${definition.introducedInFirmware}+`
    : `${catalogTarget.supportedFirmware.minimum}+`;
  const range = definition.enumValues
    ? definition.enumValues.join(" · ")
    : definition.minimum !== undefined && definition.maximum !== undefined
      ? `${definition.minimum} — ${definition.maximum}${definition.step ? ` · step ${definition.step}` : ""}`
      : "Non pubblicato";

  return (
    <aside className="card inspector">
      <div className="inspector-heading">
        <div>
          <span className="eyebrow">{definition.section.toUpperCase()}</span>
          <h2>{definition.label}</h2>
          <code>{definition.id}</code>
        </div>
        <span
          className={`confidence-pill${setting && setting.confidence < 0.7 ? " low" : ""}`}
          title="Confidenza della proposta"
        >
          {setting ? `${setting.confidence < 0.7 ? "? " : "✦ "}${Math.round(setting.confidence * 100)}%` : "× N/D"}
        </span>
      </div>

      <div className="current-value">
        <span>VALORE PATCH</span>
        <strong>
          {setting
            ? formatParameterValue(definition, setting.value)
            : "Non incluso nello scope"}
        </strong>
        <small>
          Default:{" "}
          {isParameterValue(definition.defaultValue)
            ? formatParameterValue(definition, definition.defaultValue)
            : "non pubblicato"}
        </small>
      </div>

      {setting &&
      typeof setting.value === "number" &&
      definition.minimum !== undefined &&
      definition.maximum !== undefined ? (
        <div className="manual-control">
          <label htmlFor="manual-value">
            Modifica manuale <span>{range}</span>
          </label>
          <input
            id="manual-value"
            type="range"
            min={definition.minimum}
            max={definition.maximum}
            step={definition.step ?? 1}
            value={setting.value}
            onChange={(event) =>
              setParameterValue(definition.id, Number(event.target.value))
            }
          />
        </div>
      ) : setting && definition.enumValues ? (
        <div className="manual-control">
          <label htmlFor="manual-value">Modifica manuale</label>
          <select
            id="manual-value"
            value={String(setting.value)}
            onChange={(event) =>
              setParameterValue(definition.id, event.target.value)
            }
          >
            {definition.enumValues.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      ) : setting && definition.valueType === "boolean" ? (
        <button
          className="button subtle full"
          onClick={() => setParameterValue(definition.id, setting.value !== true)}
        >
          Imposta {setting.value === true ? "Off" : "On"}
        </button>
      ) : null}

      <dl className="inspector-details">
        <div><dt>Range / menu</dt><dd>{range}</dd></div>
        <div><dt>Unità</dt><dd>{definition.unit ?? "Valore Summit"}</dd></div>
        <div><dt>Sezione</dt><dd>{definition.section}{definition.subsection ? ` · ${definition.subsection}` : ""}</dd></div>
        <div>
          <dt>Posizione fisica</dt>
          <dd>
            {panelLocations.length
              ? panelLocations.map((location) => location.controlId).join(" · ")
              : "Solo display/menu"}
          </dd>
        </div>
        <div>
          <dt>Menu correlato</dt>
          <dd>
            {menuLocations.length
              ? menuLocations
                  .map(
                    (location) =>
                      `${location.menu} · pagina ${location.page}${location.row ? ` · riga ${location.row}` : ""}`,
                  )
                  .join(" / ")
              : "Controllo diretto sul pannello"}
          </dd>
        </div>
        <div><dt>Firmware</dt><dd>{firmware}{definition.firmwareNote ? ` · ${definition.firmwareNote}` : ""}</dd></div>
        <div>
          <dt>Verifica</dt>
          <dd>
            <span className={`verification-symbol ${definition.verificationStatus}`}>
              {definition.verificationStatus === "verified" ? "✓" : "!"}
            </span>{" "}
            {definition.verificationStatus}
            {definition.verificationNote ? ` · ${definition.verificationNote}` : ""}
          </dd>
        </div>
        <div>
          <dt>MIDI verificato</dt>
          <dd>
            {verifiedMappings.length
              ? verifiedMappings
                  .map((mapping) =>
                    mapping.nrpn
                      ? `${mapping.messageType} ${mapping.nrpn}`
                      : `${mapping.messageType} CC ${mapping.controllers?.join("/") ?? "—"}`,
                  )
                  .join(" · ")
              : mappings.length
                ? "Mapping pubblicato, traduzione non sufficientemente verificata"
                : "Nessun mapping verificato nel catalogo"}
          </dd>
        </div>
        {setting ? <div><dt>Razionale</dt><dd>{setting.rationale}</dd></div> : null}
      </dl>

      {definition.documentation.sourceUrl ? (
        <a
          className="source-link"
          href={definition.documentation.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Fonte Novation: {definition.documentation.document}
          {definition.documentation.page
            ? ` · p. ${definition.documentation.page}`
            : ""}{" "}
          ↗
        </a>
      ) : null}
      <p className="verified-line">
        <span className="status-dot green" />
        Verificato il {definition.documentation.verifiedAt}
      </p>
    </aside>
  );
}
