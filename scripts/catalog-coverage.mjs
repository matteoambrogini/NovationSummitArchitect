import { readFile } from "node:fs/promises";
import path from "node:path";

const readJson = async (root, relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const statuses = ["verified", "unverified", "conflict", "unknown", "deprecated"];

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

const isApplicable = (item, targetFirmware) =>
  (!item.introducedInFirmware || compareVersions(targetFirmware, item.introducedInFirmware) >= 0) &&
  (!item.removedInFirmware || compareVersions(targetFirmware, item.removedInFirmware) < 0);

const itemStatus = (item) => item.verificationStatus ?? "verified";

const statusCounts = (items) =>
  Object.fromEntries(
    statuses.map((status) => [status, items.filter((item) => itemStatus(item) === status).length]),
  );

const isAiUsable = (item, targetFirmware) =>
  itemStatus(item) === "verified" && item.aiExposed === true && isApplicable(item, targetFirmware);

const percent = (numerator, denominator) =>
  denominator === 0 ? "—" : `${((numerator / denominator) * 100).toFixed(1)}%`;

const metrics = (items, targetFirmware, aiPredicate = isAiUsable) => {
  const counts = statusCounts(items);
  const firmwareVerified = items.filter(
    (item) =>
      itemStatus(item) === "verified" &&
      item.introducedInFirmware === targetFirmware &&
      isApplicable(item, targetFirmware),
  ).length;
  const aiUsable = items.filter((item) => aiPredicate(item, targetFirmware)).length;
  return {
    ...counts,
    firmwareVerified,
    aiUsable,
    aiCoverage: percent(aiUsable, items.length),
  };
};

const fullMetricsRow = (label, items, targetFirmware, aiPredicate = isAiUsable) => {
  const values = metrics(items, targetFirmware, aiPredicate);
  return `| ${label} | ${items.length} | ${values.verified} | ${values.unverified} | ${values.conflict} | ${values.firmwareVerified} | ${values.unknown} | ${values.aiUsable} | ${values.aiCoverage} |`;
};

const thresholdDefinitions = [
  {
    key: "oscillators",
    label: "Oscillatori",
    select: (parameters) =>
      parameters.filter((parameter) =>
        ["Oscillators", "Oscillator Menu"].includes(parameter.section),
      ),
  },
  {
    key: "fm",
    label: "FM",
    select: (parameters) => parameters.filter((parameter) => parameter.section === "FM"),
  },
  {
    key: "mixer",
    label: "Mixer",
    select: (parameters) => parameters.filter((parameter) => parameter.id.startsWith("mixer.")),
  },
  {
    key: "filter",
    label: "Filter",
    select: (parameters) => parameters.filter((parameter) => parameter.section === "Filter"),
  },
  {
    key: "envelopes",
    label: "Envelopes",
    select: (parameters) =>
      parameters.filter((parameter) =>
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
    label: "LFO",
    select: (parameters) => parameters.filter((parameter) => parameter.section.includes("LFO")),
  },
  {
    key: "voice",
    label: "Voice",
    select: (parameters) =>
      parameters.filter(
        (parameter) =>
          ["Voice", "Voice Menu", "Glide"].includes(parameter.section) &&
          !parameter.id.startsWith("mixer."),
      ),
  },
  {
    key: "reverb",
    label: "Reverb",
    select: (parameters) => parameters.filter((parameter) => parameter.section === "Reverb"),
  },
  {
    key: "delay",
    label: "Delay",
    select: (parameters) => parameters.filter((parameter) => parameter.section === "Delay"),
  },
  {
    key: "chorus",
    label: "Chorus",
    select: (parameters) => parameters.filter((parameter) => parameter.section === "Chorus"),
  },
  {
    key: "multi",
    label: "Multi",
    select: (parameters) => parameters.filter((parameter) => parameter.section === "Multi"),
  },
];

export async function renderCatalogCoverage(root) {
  const [
    target,
    parameters,
    layout,
    menuCatalog,
    modulation,
    fxModulation,
    midiCatalog,
    firmwareOverrides,
    sources,
    validFixtures,
  ] = await Promise.all([
    readJson(root, "src/data/summit-catalog-target.json"),
    readJson(root, "src/data/summit-parameter-catalog.json"),
    readJson(root, "src/data/summit-control-layout.json"),
    readJson(root, "src/data/summit-menu-catalog.json"),
    readJson(root, "src/data/summit-modulation-catalog.json"),
    readJson(root, "src/data/summit-fx-modulation-catalog.json"),
    readJson(root, "src/data/summit-midi-catalog.json"),
    readJson(root, "src/data/summit-firmware-overrides.json"),
    readJson(root, "src/data/summit-source-index.json"),
    readJson(root, "src/data/fixtures/summit-catalog-valid.json"),
  ]);

  const targetFirmware = target.primaryFirmware;
  const verifiedAt = sources.sources
    .map((source) => source.verifiedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const physicalControls = layout.controls.filter((control) => !control.stateOnly);
  const menuParameters = parameters.filter((parameter) =>
    [parameter.location, ...(parameter.alternateLocations ?? [])].some(
      (location) => location.type === "menu",
    ),
  );
  const mainModEntities = [...modulation.sources, ...modulation.destinations];
  const fxModEntities = [...fxModulation.sources, ...fxModulation.destinations];
  const coveredMenuIds = new Set(
    validFixtures.cases.map((fixture) => fixture.menuId).filter(Boolean),
  );

  const sectionRows = [...new Set(parameters.map((parameter) => parameter.section))]
    .sort((left, right) => left.localeCompare(right, "it"))
    .map((section) =>
      fullMetricsRow(
        section,
        parameters.filter((parameter) => parameter.section === section),
        targetFirmware,
      ),
    )
    .join("\n");

  const menuRows = menuCatalog.menus
    .map((menu) => {
      let items = menu.parameterIds
        .map((parameterId) => parameters.find((parameter) => parameter.id === parameterId))
        .filter(Boolean);
      if (menu.id === "mod") items = mainModEntities;
      if (menu.id === "fx-mod") items = fxModEntities;
      const values = metrics(items, targetFirmware);
      return `| ${menu.label} | ${items.length} | ${values.aiUsable} | ${values.aiCoverage} | ${coveredMenuIds.has(menu.id) ? "sì" : menu.patchRelevant ? "no" : "n/a"} | ${itemStatus(menu)} |`;
    })
    .join("\n");

  const thresholdRows = [
    ...thresholdDefinitions.map((definition) => {
      const items = definition.select(parameters);
      const values = metrics(items, targetFirmware);
      const actual = Number.parseFloat(values.aiCoverage);
      const threshold = target.coveragePolicy.thresholds[definition.key];
      return `| ${definition.label} | ≥${threshold}% | ${values.aiUsable}/${items.length} | ${values.aiCoverage} | ${actual >= threshold ? "raggiunta" : "eccezione documentata"} |`;
    }),
    (() => {
      const values = metrics(mainModEntities, targetFirmware);
      const threshold = target.coveragePolicy.thresholds.mod;
      return `| Mod Matrix | ≥${threshold}% | ${values.aiUsable}/${mainModEntities.length} | ${values.aiCoverage} | ${Number.parseFloat(values.aiCoverage) >= threshold ? "raggiunta" : "eccezione documentata"} |`;
    })(),
    (() => {
      const values = metrics(fxModEntities, targetFirmware);
      const threshold = target.coveragePolicy.thresholds.fxMod;
      return `| FX Mod Matrix | ≥${threshold}% | ${values.aiUsable}/${fxModEntities.length} | ${values.aiCoverage} | ${Number.parseFloat(values.aiCoverage) >= threshold ? "raggiunta" : "eccezione documentata"} |`;
    })(),
  ].join("\n");

  const statusRows = [
    fullMetricsRow("Parametri", parameters, targetFirmware),
    fullMetricsRow(
      "Controlli fisici",
      physicalControls,
      targetFirmware,
      (item, firmware) => itemStatus(item) === "verified" && isApplicable(item, firmware),
    ),
    fullMetricsRow(
      "Menu",
      menuCatalog.menus,
      targetFirmware,
      (item, firmware) => itemStatus(item) === "verified" && isApplicable(item, firmware),
    ),
    fullMetricsRow("Sorgenti Mod", modulation.sources, targetFirmware),
    fullMetricsRow("Destinazioni Mod", modulation.destinations, targetFirmware),
    fullMetricsRow("Sorgenti FX Mod", fxModulation.sources, targetFirmware),
    fullMetricsRow("Destinazioni FX Mod", fxModulation.destinations, targetFirmware),
    fullMetricsRow(
      "Mapping MIDI",
      midiCatalog.mappings,
      targetFirmware,
      (mapping, firmware) => mapping.aiUsable === true && isApplicable(mapping, firmware),
    ),
    fullMetricsRow("Override firmware", firmwareOverrides.overrides, targetFirmware, () => false),
  ].join("\n");

  const midiMappingCounts = statusCounts(midiCatalog.mappings);
  const midiTranslationCounts = statusCounts(
    midiCatalog.mappings.map((mapping) => mapping.translation),
  );
  const aiMidi = midiCatalog.mappings.filter(
    (mapping) => mapping.aiUsable && isApplicable(mapping, targetFirmware),
  ).length;
  const attributeConflictCount = parameters.reduce(
    (total, parameter) => total + (parameter.attributeConflicts?.length ?? 0),
    0,
  );

  return `# Copertura del catalogo Summit

> File generato da \`pnpm catalog:coverage\`. Non modificare manualmente.

Target primario: **Novation Summit firmware ${targetFirmware}**. Ultima verifica delle fonti: ${verifiedAt}.

## Definizioni

- **Verified/Unverified/Conflict/Unknown** descrivono l'affidabilità del dato e non la sua compatibilità firmware.
- **Firmware ${targetFirmware} verified** conta il sottoinsieme verificato introdotto esattamente in ${targetFirmware}; non è uno stato alternativo.
- **AI usable @${targetFirmware}** richiede stato \`verified\`, \`aiExposed: true\` e applicabilità al target. Per il MIDI richiede inoltre una traduzione verificata.
- **Copertura AI** è la metrica principale per la readiness del sound design. Il MIDI è riportato separatamente ed è escluso dalle soglie.

## Definition of done

| Area | Soglia | AI usable @${targetFirmware} | Copertura AI | Esito |
| --- | ---: | ---: | ---: | --- |
${thresholdRows}

Le eccezioni sotto soglia sono circoscritte e non vengono colmate con inferenze:

- **FM (${metrics(thresholdDefinitions[1].select(parameters), targetFirmware).aiCoverage})**: le tre profondità Manual sono verificabili e utilizzabili. Per le sei profondità LFO 2/Mod Env 2 le fonti ufficiali confermano rotta e semantica additiva, ma non pubblicano dominio, default o traduzione MIDI; restano \`unverified\`.
- **Multi (${metrics(thresholdDefinitions.at(-1).select(parameters), targetFirmware).aiCoverage})**: otto controlli hanno dominio sicuro. \`multi.partA.level\` e \`multi.partB.level\` sono visibili nella guida, ma il dominio e il default non sono documentati; restano \`unknown\`.

## Stato per catalogo

| Catalogo | Totale | Verified | Unverified | Conflict | Firmware ${targetFirmware} verified | Unknown/undocumented | AI usable @${targetFirmware} | Copertura AI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${statusRows}

Il catalogo parametrico conserva inoltre **${attributeConflictCount} conflitto a livello di attributo**: il default di Reverb Size (64 nella guida 1.1/tabella MIDI, 90 nella guida online). Il parametro resta verificato e AI-usable perché dominio e comportamento non sono in conflitto.

## Copertura per sezione parametrica

| Sezione | Totale | Verified | Unverified | Conflict | Firmware ${targetFirmware} verified | Unknown/undocumented | AI usable @${targetFirmware} | Copertura AI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${sectionRows}

## Copertura per menu patch-relevant

| Menu | Entità catalogate | AI usable @${targetFirmware} | Copertura AI | Fixture valida | Stato del menu |
| --- | ---: | ---: | ---: | --- | --- |
${menuRows}

Lo stato del menu descrive la certezza della navigazione, non invalida i parametri verificati al suo interno. Voice resta \`conflict\` perché la guida online dichiara quattro pagine ma ne documenta cinque; FX resta \`conflict\` perché il testo conserva il vecchio conteggio mentre le schermate firmware mostrano dieci pagine.

## MIDI

| Livello | Verified | Unverified | Conflict | Unknown | AI usable @${targetFirmware} |
| --- | ---: | ---: | ---: | ---: | ---: |
| Esistenza/indirizzo mapping | ${midiMappingCounts.verified} | ${midiMappingCounts.unverified} | ${midiMappingCounts.conflict} | ${midiMappingCounts.unknown} | ${aiMidi} |
| Traduzione raw ↔ Summit | ${midiTranslationCounts.verified} | ${midiTranslationCounts.unverified} | ${midiTranslationCounts.conflict} | ${midiTranslationCounts.unknown} | ${aiMidi} |

I **${midiCatalog.unlistedParameters.length}** parametri classificati \`officially-absent\` non compaiono nella lista MIDI ufficiale pubblicata. Questa classificazione non equivale a “non controllabile”: impedisce soltanto di inventare un mapping. L'esistenza del mapping Arp Chance è verificata, ma la traduzione resta \`conflict\` perché la tabella MIDI pubblica 1–100 mentre il parametro firmware pubblica 10–100.

## Residui non AI-usable

Oltre alle eccezioni FM e Multi:

- \`osc.common.tuningTable\` resta \`unverified\` per il sound design: il selettore 0–16 è documentato, ma il contenuto delle tabelle 1–16 è configurabile dall'utente.
- \`arp.octaves\` resta \`conflict\` perché le fonti ufficiali consultate non concordano sul limite massimo.
- Le tre voci \`osc*.waveMore\` sono verificate e AI-usable soltanto per le prime 50 wavetable di fabbrica; gli ultimi 10 slot configurabili dall'utente sono rifiutati dal validatore.
`;
}
