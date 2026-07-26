import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

const parameters = await readJson("src/data/summit-parameter-catalog.json");
const layout = await readJson("src/data/summit-control-layout.json");
const menuCatalog = await readJson("src/data/summit-menu-catalog.json");
const modulation = await readJson("src/data/summit-modulation-catalog.json");
const fxModulation = await readJson("src/data/summit-fx-modulation-catalog.json");
const midiCatalog = await readJson("src/data/summit-midi-catalog.json");
const firmwareOverrides = await readJson("src/data/summit-firmware-overrides.json");
const validFixtures = await readJson("src/data/fixtures/summit-catalog-valid.json");
const invalidFixtures = await readJson("src/data/fixtures/summit-catalog-invalid.json");

const errors = [];
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
  if (parameter.aiExposed && parameter.verificationStatus !== "verified")
    errors.push(`Parametro AI-exposed non verified: ${parameter.id}`);
  if (
    parameter.minimum !== undefined &&
    parameter.maximum !== undefined &&
    parameter.minimum > parameter.maximum
  )
    errors.push(`Range invertito: ${parameter.id}`);
  if (parameter.valueType === "enum" && !parameter.enumValues?.length)
    errors.push(`Enum vuoto: ${parameter.id}`);
  const locations = [parameter.location, ...(parameter.alternateLocations ?? [])];
  if (locations.some((location) => location?.type === "menu" && !location.page))
    errors.push(`Pagina menu mancante: ${parameter.id}`);
}

for (const control of layout.controls) {
  const bindings = control.parameterIds ?? (control.parameterId ? [control.parameterId] : []);
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
  if (mapping.rawRange && mapping.rawRange.minimum > mapping.rawRange.maximum)
    errors.push(`Range MIDI invertito: ${mapping.id}`);
  if (
    mapping.verificationStatus === "verified" &&
    mapping.translation?.verificationStatus !== "verified"
  )
    errors.push(`Traduzione MIDI non verificata per mapping verified: ${mapping.id}`);
}

const nonControllableIds = new Set();
for (const entry of midiCatalog.nonControllable) {
  if (!ids.has(entry.parameterId))
    errors.push(`Parametro non controllabile MIDI assente: ${entry.parameterId}`);
  if (nonControllableIds.has(entry.parameterId))
    errors.push(`Parametro non controllabile MIDI duplicato: ${entry.parameterId}`);
  nonControllableIds.add(entry.parameterId);
}
for (const parameterId of ids) {
  if (!midiMappedParameterIds.has(parameterId) && !nonControllableIds.has(parameterId))
    errors.push(`Copertura MIDI mancante: ${parameterId}`);
}

for (const override of firmwareOverrides.overrides) {
  if (!override.documentation?.sourceUrl || !override.documentation?.verifiedAt)
    errors.push(`Fonte override firmware mancante: ${override.id}`);
  for (const parameterId of override.parameterIds ?? []) {
    if (!ids.has(parameterId))
      errors.push(`Override firmware ${override.id} riferisce parametro assente: ${parameterId}`);
  }
}

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

const validateFixture = (fixture) => {
  const issueCodes = [];
  if (fixture.kind === "parameter") {
    const parameter = parameterById.get(fixture.parameterId);
    if (!parameter) return ["parameter-not-found"];

    if (
      parameter.firmware?.minimum &&
      compareVersions(fixture.firmware, parameter.firmware.minimum) < 0
    ) {
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
          location.type === "menu" &&
          location.menu === fixture.location.menu &&
          location.page === fixture.location.page,
      )
    ) {
      issueCodes.push("location-mismatch");
    }
  } else if (fixture.kind === "main-modulation" || fixture.kind === "fx-modulation") {
    const catalog = fixture.kind === "main-modulation" ? modulation : fxModulation;
    if (
      !catalog.sources.some(
        (source) => source.id === fixture.source && source.verificationStatus === "verified",
      )
    ) {
      issueCodes.push("mod-source-not-found");
    }
    if (
      !catalog.destinations.some(
        (destination) =>
          destination.id === fixture.destination && destination.verificationStatus === "verified",
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
      mapping.aiUsable !== true
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
