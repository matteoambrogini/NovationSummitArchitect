import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

const target = await readJson("src/data/summit-catalog-target.json");
const parameters = await readJson("src/data/summit-parameter-catalog.json");
const layout = await readJson("src/data/summit-control-layout.json");
const displayStructure = await readJson("src/data/summit-display-structure.json");
const menuCatalog = await readJson("src/data/summit-menu-catalog.json");
const modulation = await readJson("src/data/summit-modulation-catalog.json");
const fxModulation = await readJson("src/data/summit-fx-modulation-catalog.json");
const midiCatalog = await readJson("src/data/summit-midi-catalog.json");
const firmwareOverrides = await readJson("src/data/summit-firmware-overrides.json");
const validFixtures = await readJson("src/data/fixtures/summit-catalog-valid.json");
const invalidFixtures = await readJson("src/data/fixtures/summit-catalog-invalid.json");

const errors = [];
const verificationStatuses = new Set([
  "verified",
  "unverified",
  "conflict",
  "unknown",
  "deprecated",
]);
const firmwarePattern = /^\d+\.\d+(?:\.\d+)?$/;
const compareVersions = (left, right) => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const partCount = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < partCount; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};
const firmwareFieldsValid = (item, label) => {
  for (const field of ["introducedInFirmware", "removedInFirmware"]) {
    if (item[field] !== undefined && !firmwarePattern.test(item[field])) {
      errors.push(`Versione firmware non valida per ${label}.${field}: ${item[field]}`);
    }
  }
};

if (
  !firmwarePattern.test(target.primaryFirmware) ||
  target.primaryFirmware !== target.supportedFirmware.target
) {
  errors.push("Target firmware primario non valido o non allineato a supportedFirmware.target");
}

const ids = new Set();
const parameterById = new Map();
for (const parameter of parameters) {
  if (ids.has(parameter.id)) errors.push(`ID duplicato: ${parameter.id}`);
  ids.add(parameter.id);
  parameterById.set(parameter.id, parameter);
  if (
    !parameter.documentation?.document ||
    !parameter.documentation?.section ||
    !parameter.documentation?.sourceUrl ||
    !parameter.documentation?.verifiedAt
  )
    errors.push(`Riferimento incompleto: ${parameter.id}`);
  if (parameter.verificationStatus === "verified" && !parameter.documentation?.verification)
    errors.push(`Verifica indipendente mancante: ${parameter.id}`);
  if (!verificationStatuses.has(parameter.verificationStatus))
    errors.push(`Stato di verifica non valido: ${parameter.id}`);
  if (parameter.aiExposed && parameter.verificationStatus !== "verified")
    errors.push(`Parametro AI-exposed non verified: ${parameter.id}`);
  firmwareFieldsValid(parameter, parameter.id);
  if (
    parameter.minimum !== undefined &&
    parameter.maximum !== undefined &&
    parameter.minimum > parameter.maximum
  )
    errors.push(`Range invertito: ${parameter.id}`);
  if (parameter.valueType === "enum" && !parameter.enumValues?.length)
    errors.push(`Enum vuoto: ${parameter.id}`);
  if (
    parameter.aiStableEnumValueCount !== undefined &&
    (!parameter.enumValues ||
      parameter.aiStableEnumValueCount < 1 ||
      parameter.aiStableEnumValueCount > parameter.enumValues.length)
  )
    errors.push(`Limite enum AI non valido: ${parameter.id}`);
  if (parameter.aiEnumValues?.some((value) => !parameter.enumValues?.includes(value)))
    errors.push(`aiEnumValues non incluso in enumValues: ${parameter.id}`);
  const locations = [parameter.location, ...(parameter.alternateLocations ?? [])];
  if (locations.some((location) => location?.type === "menu" && !location.page))
    errors.push(`Pagina menu mancante: ${parameter.id}`);
  for (const location of locations) firmwareFieldsValid(location, `${parameter.id}.location`);
}

for (const control of layout.controls) {
  const bindings = control.parameterIds ?? (control.parameterId ? [control.parameterId] : []);
  for (const parameterId of control.controlsParameterIds ?? []) {
    if (!parameterById.has(parameterId)) {
      errors.push(`Selettore UI riferisce parametro assente: ${control.id} -> ${parameterId}`);
    }
  }
  if (control.contextSelectorId && control.route) {
    const selector = layout.controls.find(
      (candidate) => candidate.id === control.contextSelectorId,
    );
    if (!selector?.stateOnly) {
      errors.push(`Selettore contestuale assente o non state-only: ${control.id}`);
    } else {
      const selectorParameterIds = selector.controlsParameterIds ?? [];
      if (
        bindings.length !== selectorParameterIds.length ||
        bindings.some((parameterId) => !selectorParameterIds.includes(parameterId))
      ) {
        errors.push(`Selettore contestuale non allineato ai binding: ${control.id}`);
      }
    }
  }
  if (control.stateOnly) continue;
  if (!bindings.length) errors.push(`Controllo UI senza binding: ${control.id}`);
  for (const parameterId of bindings) {
    const parameter = parameterById.get(parameterId);
    if (!parameter) errors.push(`Controllo UI senza parametro: ${control.id} -> ${parameterId}`);
    else if (
      ![parameter.location, ...(parameter.alternateLocations ?? [])].some(
        (location) => location.type === "panel",
      )
    )
      errors.push(
        `Controllo UI mappa un parametro senza posizione pannello: ${control.id} -> ${parameterId}`,
      );
  }
}

if (
  !layout.geometry?.document ||
  !layout.geometry?.section ||
  !layout.geometry?.page ||
  !layout.geometry?.sourceUrl ||
  !layout.geometry?.verifiedAt
) {
  errors.push("Metadati della geometria del pannello incompleti");
}
const sectionIds = new Set(layout.sections.map((section) => section.id));
const controlIds = new Set();
for (const control of layout.controls) {
  if (controlIds.has(control.id)) errors.push(`Controllo UI duplicato: ${control.id}`);
  controlIds.add(control.id);
  if (!sectionIds.has(control.sectionId)) {
    errors.push(`Sezione layout assente per ${control.id}: ${control.sectionId}`);
  }
  if (![control.x, control.y].every(Number.isFinite)) {
    errors.push(`Coordinate layout non valide: ${control.id}`);
  }
}

if (
  displayStructure.targetFirmware !== target.primaryFirmware ||
  !displayStructure.documentation?.document ||
  !displayStructure.documentation?.section ||
  !displayStructure.documentation?.sourceUrl ||
  !displayStructure.documentation?.verifiedAt
) {
  errors.push("Struttura display senza target firmware o riferimento completo");
}
const displayAreaIds = new Set();
const displayParameterIds = new Set();
for (const area of displayStructure.areas) {
  if (displayAreaIds.has(area.id)) errors.push(`Area display duplicata: ${area.id}`);
  displayAreaIds.add(area.id);
  if (area.evidence?.endSeconds < area.evidence?.startSeconds) {
    errors.push(`Intervallo video invertito: ${area.id}`);
  }
  if (area.kind === "pages" && area.pages.length === 0) {
    errors.push(`Area display senza pagine: ${area.id}`);
  }
  if (area.kind === "slots" && (!area.slotCount || area.slotFields?.length !== 4)) {
    errors.push(`Area slot incompleta: ${area.id}`);
  }
  (area.pages ?? []).forEach((page, pageIndex) => {
    if (page.page !== pageIndex + 1) {
      errors.push(`Numerazione pagina non contigua: ${area.id} pagina ${page.page}`);
    }
    page.fields.forEach((field, fieldIndex) => {
      if (field.line !== fieldIndex + 1) {
        errors.push(`Riga display non contigua: ${area.id}/${page.page}/${field.id}`);
      }
      if (field.parameterId) {
        if (!parameterById.has(field.parameterId)) {
          errors.push(
            `Campo display senza parametro: ${area.id}/${page.page} -> ${field.parameterId}`,
          );
        }
        if (displayParameterIds.has(field.parameterId)) {
          errors.push(`Parametro display duplicato: ${field.parameterId}`);
        }
        displayParameterIds.add(field.parameterId);
      } else if (!field.unmappedReason) {
        errors.push(
          `Campo display non mappato senza motivazione: ${area.id}/${page.page}/${field.id}`,
        );
      }
    });
  });
}
for (const control of layout.controls.filter((candidate) => candidate.displayAreaId)) {
  if (!displayAreaIds.has(control.displayAreaId)) {
    errors.push(`Pulsante hardware riferisce area display assente: ${control.id}`);
  }
}

for (const parameter of parameters.filter((candidate) =>
  [candidate.location, ...(candidate.alternateLocations ?? [])].some(
    (location) => location.type === "panel",
  ),
)) {
  if (
    !layout.controls.some((control) =>
      (control.parameterIds ?? [control.parameterId]).includes(parameter.id),
    )
  )
    errors.push(`Parametro pannello senza controllo UI: ${parameter.id}`);
}

for (const menu of menuCatalog.menus) {
  for (const id of menu.parameterIds) {
    const parameter = parameters.find((candidate) => candidate.id === id);
    if (!parameter) errors.push(`Menu ${menu.id} riferisce parametro assente: ${id}`);
    else {
      const menuLocations = [parameter.location, ...(parameter.alternateLocations ?? [])].filter(
        (location) =>
          location.type === "menu" && location.menu.toLowerCase() === menu.label.toLowerCase(),
      );
      if (!menuLocations.length)
        errors.push(`Menu incoerente per ${id}: nessuna posizione ${menu.label}`);
      for (const location of menuLocations) {
        if (
          parameter.verificationStatus === "verified" &&
          isFirmwareApplicable(location, target.primaryFirmware) &&
          !menu.verifiedPages.includes(location.page)
        )
          errors.push(`Pagina menu non verificata per ${id}: ${location.page}`);
      }
    }
  }
}

for (const catalog of [modulation, fxModulation]) {
  const sourceIds = new Set();
  for (const source of catalog.sources) {
    if (sourceIds.has(source.id)) errors.push(`Sorgente modulazione duplicata: ${source.id}`);
    sourceIds.add(source.id);
    if (!verificationStatuses.has(source.verificationStatus))
      errors.push(`Stato sorgente modulazione non valido: ${source.id}`);
    firmwareFieldsValid(source, `mod-source.${source.id}`);
    if (
      !(source.documentation ?? catalog.documentation)?.sourceUrl ||
      !(source.documentation ?? catalog.documentation)?.verifiedAt
    )
      errors.push(`Fonte sorgente modulazione mancante: ${source.id}`);
  }
  const destinationIds = new Set();
  for (const destination of catalog.destinations) {
    if (destinationIds.has(destination.id))
      errors.push(`Destinazione modulazione duplicata: ${destination.id}`);
    destinationIds.add(destination.id);
    if (!verificationStatuses.has(destination.verificationStatus))
      errors.push(`Stato destinazione modulazione non valido: ${destination.id}`);
    firmwareFieldsValid(destination, `mod-destination.${destination.id}`);
    if (
      !(destination.documentation ?? catalog.documentation)?.sourceUrl ||
      !(destination.documentation ?? catalog.documentation)?.verifiedAt
    )
      errors.push(`Fonte destinazione modulazione mancante: ${destination.id}`);
    for (const parameterId of destination.parameterIds ?? []) {
      if (!ids.has(parameterId))
        errors.push(`Destinazione ${destination.id} punta a parametro assente: ${parameterId}`);
    }
  }
  if (!Number.isInteger(catalog.slots) || catalog.slots < 1)
    errors.push("Numero slot modulazione non valido");
  if (catalog.slotDefinitions?.length && catalog.slotDefinitions.length !== catalog.slots)
    errors.push(`Definizioni slot incomplete: ${catalog.slotDefinitions.length}/${catalog.slots}`);
}

const midiMappingIds = new Set();
const midiMappedParameterIds = new Set();
for (const mapping of midiCatalog.mappings) {
  if (midiMappingIds.has(mapping.id)) errors.push(`Mappatura MIDI duplicata: ${mapping.id}`);
  midiMappingIds.add(mapping.id);
  midiMappedParameterIds.add(mapping.parameterId);
  if (!ids.has(mapping.parameterId))
    errors.push(`Mappatura MIDI senza parametro: ${mapping.id} -> ${mapping.parameterId}`);
  if (!mapping.documentation?.sourceUrl || !mapping.documentation?.verifiedAt)
    errors.push(`Fonte MIDI mancante: ${mapping.id}`);
  if (!verificationStatuses.has(mapping.verificationStatus))
    errors.push(`Stato mapping MIDI non valido: ${mapping.id}`);
  if (!verificationStatuses.has(mapping.translation?.verificationStatus))
    errors.push(`Stato traduzione MIDI non valido: ${mapping.id}`);
  firmwareFieldsValid(mapping, `midi.${mapping.id}`);
  if (mapping.rawRange && mapping.rawRange.minimum > mapping.rawRange.maximum)
    errors.push(`Range MIDI invertito: ${mapping.id}`);
  if (
    mapping.aiUsable === true &&
    (mapping.verificationStatus !== "verified" ||
      mapping.translation?.verificationStatus !== "verified" ||
      !isFirmwareApplicable(mapping, target.primaryFirmware))
  )
    errors.push(`Mapping MIDI AI-usable non sicuro sul target: ${mapping.id}`);
}

const unlistedParameterIds = new Set();
for (const entry of midiCatalog.unlistedParameters) {
  if (!ids.has(entry.parameterId))
    errors.push(`Parametro non elencato MIDI assente: ${entry.parameterId}`);
  if (unlistedParameterIds.has(entry.parameterId))
    errors.push(`Parametro non elencato MIDI duplicato: ${entry.parameterId}`);
  if (!["officially-absent", "unknown"].includes(entry.publicationStatus))
    errors.push(`Classificazione pubblicazione MIDI non valida: ${entry.parameterId}`);
  if (!entry.documentation?.sourceUrl || !entry.documentation?.verifiedAt)
    errors.push(`Fonte parametro non elencato MIDI mancante: ${entry.parameterId}`);
  unlistedParameterIds.add(entry.parameterId);
}
for (const parameterId of ids) {
  if (!midiMappedParameterIds.has(parameterId) && !unlistedParameterIds.has(parameterId))
    errors.push(`Copertura MIDI mancante: ${parameterId}`);
}

const aiUsableAtTarget = (item) =>
  item.verificationStatus === "verified" &&
  item.aiExposed === true &&
  isFirmwareApplicable(item, target.primaryFirmware);

const coverageAreas = [
  {
    key: "oscillators",
    items: parameters.filter((parameter) =>
      ["Oscillators", "Oscillator Menu"].includes(parameter.section),
    ),
  },
  {
    key: "fm",
    items: parameters.filter((parameter) => parameter.section === "FM"),
  },
  {
    key: "mixer",
    items: parameters.filter((parameter) => parameter.id.startsWith("mixer.")),
  },
  {
    key: "filter",
    items: parameters.filter((parameter) => parameter.section === "Filter"),
  },
  {
    key: "envelopes",
    items: parameters.filter((parameter) =>
      [
        "Amp Envelope",
        "Mod Envelope 1",
        "Mod Envelope 2",
        "Envelope Menu",
        "Animate Envelopes",
      ].includes(parameter.section),
    ),
  },
  {
    key: "lfo",
    items: parameters.filter((parameter) => parameter.section.includes("LFO")),
  },
  {
    key: "voice",
    items: parameters.filter(
      (parameter) =>
        ["Voice", "Voice Menu", "Glide"].includes(parameter.section) &&
        !parameter.id.startsWith("mixer."),
    ),
  },
  {
    key: "reverb",
    items: parameters.filter((parameter) => parameter.section === "Reverb"),
  },
  {
    key: "delay",
    items: parameters.filter((parameter) => parameter.section === "Delay"),
  },
  {
    key: "chorus",
    items: parameters.filter((parameter) => parameter.section === "Chorus"),
  },
  {
    key: "mod",
    items: [...modulation.sources, ...modulation.destinations],
  },
  {
    key: "fxMod",
    items: [...fxModulation.sources, ...fxModulation.destinations],
  },
  {
    key: "multi",
    items: parameters.filter((parameter) => parameter.section === "Multi"),
  },
];

for (const area of coverageAreas) {
  const threshold = target.coveragePolicy.thresholds[area.key];
  if (typeof threshold !== "number") {
    errors.push(`Soglia di copertura mancante: ${area.key}`);
    continue;
  }
  const residualIds = area.items.filter((item) => !aiUsableAtTarget(item)).map((item) => item.id);
  const coverage =
    area.items.length === 0
      ? 0
      : ((area.items.length - residualIds.length) / area.items.length) * 100;
  if (coverage >= threshold) continue;

  const exception = target.coveragePolicy.documentedExceptions[area.key];
  if (!exception) {
    errors.push(`Soglia AI ${area.key} non raggiunta: ${coverage.toFixed(1)}% < ${threshold}%`);
    continue;
  }
  const declaredResidualIds = new Set(exception.residualIds);
  const uncoveredResiduals = residualIds.filter(
    (parameterId) => !declaredResidualIds.has(parameterId),
  );
  const staleResiduals = exception.residualIds.filter(
    (parameterId) => !residualIds.includes(parameterId),
  );
  if (uncoveredResiduals.length || staleResiduals.length) {
    errors.push(
      `Eccezione ${area.key} non allineata ai residui: mancanti [${uncoveredResiduals.join(", ")}], obsoleti [${staleResiduals.join(", ")}]`,
    );
  }
}

for (const override of firmwareOverrides.overrides) {
  if (!override.documentation?.sourceUrl || !override.documentation?.verifiedAt)
    errors.push(`Fonte override firmware mancante: ${override.id}`);
  for (const parameterId of override.parameterIds ?? []) {
    if (!ids.has(parameterId))
      errors.push(`Override firmware ${override.id} riferisce parametro assente: ${parameterId}`);
  }
}

function isFirmwareApplicable(item, firmware) {
  if (item.introducedInFirmware && compareVersions(firmware, item.introducedInFirmware) < 0)
    return false;
  if (item.removedInFirmware && compareVersions(firmware, item.removedInFirmware) >= 0)
    return false;
  return true;
}

const validateFixture = (fixture) => {
  const issueCodes = [];
  if (fixture.kind === "parameter") {
    const parameter = parameterById.get(fixture.parameterId);
    if (!parameter) return ["parameter-not-found"];

    if (!isFirmwareApplicable(parameter, fixture.firmware)) {
      issueCodes.push("firmware-incompatible");
    }
    if (parameter.scope === "global" && fixture.surfaceScope === "part") {
      issueCodes.push("global-parameter-in-patch");
    } else if (parameter.scope !== fixture.surfaceScope) {
      issueCodes.push("scope-mismatch");
    }
    if (
      parameter.singleMultiApplicability !== "both" &&
      parameter.singleMultiApplicability !== fixture.mode
    ) {
      issueCodes.push("mode-mismatch");
    }
    if (parameter.verificationStatus !== "verified") {
      issueCodes.push("parameter-not-verified");
    }
    if (parameter.enumValues && !parameter.enumValues.includes(String(fixture.value))) {
      issueCodes.push("enum-value-not-found");
    }
    if (
      parameter.enumValueFirmware?.[String(fixture.value)] &&
      !isFirmwareApplicable(parameter.enumValueFirmware[String(fixture.value)], fixture.firmware)
    ) {
      issueCodes.push("firmware-incompatible");
    }
    if (
      parameter.aiStableEnumValueCount !== undefined &&
      parameter.enumValues.indexOf(String(fixture.value)) >= parameter.aiStableEnumValueCount
    ) {
      issueCodes.push("enum-value-not-ai-stable");
    }
    if (
      typeof fixture.value === "number" &&
      ((parameter.minimum !== undefined && fixture.value < parameter.minimum) ||
        (parameter.maximum !== undefined && fixture.value > parameter.maximum))
    ) {
      issueCodes.push("range-out-of-bounds");
    }
    const locations = [parameter.location, ...(parameter.alternateLocations ?? [])];
    if (
      !locations.some(
        (location) =>
          isFirmwareApplicable(location, fixture.firmware) &&
          location.type === "menu" &&
          location.menu === fixture.location.menu &&
          location.page === fixture.location.page,
      )
    ) {
      issueCodes.push("location-mismatch");
    }
  } else if (fixture.kind === "main-modulation" || fixture.kind === "fx-modulation") {
    const catalog = fixture.kind === "main-modulation" ? modulation : fxModulation;
    const fixtureFirmware = fixture.firmware ?? target.primaryFirmware;
    if (
      !catalog.sources.some(
        (source) =>
          source.id === fixture.source &&
          source.verificationStatus === "verified" &&
          isFirmwareApplicable(source, fixtureFirmware),
      )
    ) {
      issueCodes.push("mod-source-not-found");
    }
    if (
      !catalog.destinations.some(
        (destination) =>
          destination.id === fixture.destination &&
          destination.verificationStatus === "verified" &&
          isFirmwareApplicable(destination, fixtureFirmware),
      )
    ) {
      issueCodes.push("mod-destination-not-found");
    }
    if (!Number.isInteger(fixture.slot) || fixture.slot < 1 || fixture.slot > catalog.slots) {
      issueCodes.push("mod-slot-out-of-bounds");
    }
    if (
      !Number.isInteger(fixture.depth) ||
      fixture.depth < catalog.depthRange.minimum ||
      fixture.depth > catalog.depthRange.maximum
    ) {
      issueCodes.push("mod-depth-out-of-bounds");
    }
  } else if (fixture.kind === "midi") {
    const mapping = midiCatalog.mappings.find((candidate) => candidate.id === fixture.mappingId);
    if (!mapping) {
      issueCodes.push("midi-mapping-not-found");
    } else if (
      mapping.verificationStatus !== "verified" ||
      mapping.translation.verificationStatus !== "verified" ||
      mapping.aiUsable !== true ||
      !isFirmwareApplicable(mapping, fixture.firmware ?? target.primaryFirmware)
    ) {
      issueCodes.push("midi-translation-unverified");
    }
  } else {
    issueCodes.push("fixture-kind-unsupported");
  }
  return [...new Set(issueCodes)];
};

const fixtureIds = new Set();
for (const fixture of [...validFixtures.cases, ...invalidFixtures.cases]) {
  if (fixtureIds.has(fixture.id)) errors.push(`Fixture duplicata: ${fixture.id}`);
  fixtureIds.add(fixture.id);
}
for (const fixture of validFixtures.cases) {
  const issueCodes = validateFixture(fixture);
  if (issueCodes.length) {
    errors.push(`Fixture valida ${fixture.id} rifiutata: ${issueCodes.join(", ")}`);
  }
}
for (const fixture of invalidFixtures.cases) {
  const issueCodes = validateFixture(fixture);
  if (!issueCodes.includes(fixture.expectedErrorCode)) {
    errors.push(
      `Fixture invalida ${fixture.id} non produce ${fixture.expectedErrorCode}: ${issueCodes.join(", ") || "nessun errore"}`,
    );
  }
}
const coveredMenuIds = new Set(
  validFixtures.cases.map((fixture) => fixture.menuId).filter(Boolean),
);
for (const menu of menuCatalog.menus.filter((candidate) => candidate.patchRelevant)) {
  if (!coveredMenuIds.has(menu.id)) {
    errors.push(`Menu patch-relevant senza fixture valida: ${menu.id}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Cataloghi validi: ${parameters.length} parametri, ${layout.controls.length} controlli UI, ${menuCatalog.menus.length} menu verificati.`,
);
