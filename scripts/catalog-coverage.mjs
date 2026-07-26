import { readFile } from "node:fs/promises";
import path from "node:path";

const readJson = async (root, relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const statuses = ["verified", "unverified", "conflict", "firmware-dependent", "deprecated"];

const itemStatus = (item) => item.verificationStatus ?? "verified";

const statusCounts = (items) =>
  Object.fromEntries(
    statuses.map((status) => [status, items.filter((item) => itemStatus(item) === status).length]),
  );

const percent = (verified, total) =>
  total === 0 ? "—" : `${((verified / total) * 100).toFixed(1)}%`;

const statusRow = (label, items) => {
  const counts = statusCounts(items);
  return `| ${label} | ${items.length} | ${counts.verified} | ${counts.unverified} | ${counts.conflict} | ${counts["firmware-dependent"]} | ${counts.deprecated} |`;
};

export async function renderCatalogCoverage(root) {
  const [
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
  const verifiedParameters = parameters.filter(
    (parameter) => parameter.verificationStatus === "verified",
  ).length;
  const verifiedMenuParameters = menuParameters.filter(
    (parameter) => parameter.verificationStatus === "verified",
  ).length;
  const verifiedControls = physicalControls.filter(
    (control) => itemStatus(control) === "verified",
  ).length;
  const verifiedMidiMappings = midiCatalog.mappings.filter(
    (mapping) =>
      mapping.verificationStatus === "verified" &&
      mapping.translation.verificationStatus === "verified",
  ).length;
  const coveredMenuIds = new Set(
    validFixtures.cases.map((fixture) => fixture.menuId).filter(Boolean),
  );

  const sectionRows = [...new Set(parameters.map((parameter) => parameter.section))]
    .sort((left, right) => left.localeCompare(right, "it"))
    .map((section) => {
      const sectionParameters = parameters.filter((parameter) => parameter.section === section);
      const verified = sectionParameters.filter(
        (parameter) => parameter.verificationStatus === "verified",
      ).length;
      return `| ${section} | ${sectionParameters.length} | ${verified} | ${percent(verified, sectionParameters.length)} |`;
    })
    .join("\n");

  const menuRows = menuCatalog.menus
    .map((menu) => {
      let items = menu.parameterIds
        .map((parameterId) => parameters.find((parameter) => parameter.id === parameterId))
        .filter(Boolean);
      if (menu.id === "mod") {
        items = [...modulation.sources, ...modulation.destinations];
      } else if (menu.id === "fx-mod") {
        items = [...fxModulation.sources, ...fxModulation.destinations];
      }
      const verified = items.filter((item) => itemStatus(item) === "verified").length;
      return `| ${menu.label} | ${items.length} | ${verified} | ${percent(verified, items.length)} | ${coveredMenuIds.has(menu.id) ? "sì" : menu.patchRelevant ? "no" : "n/a"} |`;
    })
    .join("\n");

  const statusRows = [
    statusRow("Parametri", parameters),
    statusRow("Controlli fisici", physicalControls),
    statusRow("Menu", menuCatalog.menus),
    statusRow("Sorgenti Mod", modulation.sources),
    statusRow("Destinazioni Mod", modulation.destinations),
    statusRow("Sorgenti FX Mod", fxModulation.sources),
    statusRow("Destinazioni FX Mod", fxModulation.destinations),
    statusRow("Mapping MIDI", midiCatalog.mappings),
    statusRow("Override firmware", firmwareOverrides.overrides),
  ].join("\n");

  return `# Copertura del catalogo Summit

> File generato da \`pnpm catalog:coverage\`. Non modificare manualmente.

Ultima verifica delle fonti: ${verifiedAt}.

## Sintesi

| Area | Totale | Verificati | Copertura |
| --- | ---: | ---: | ---: |
| Parametri | ${parameters.length} | ${verifiedParameters} | ${percent(verifiedParameters, parameters.length)} |
| Parametri con posizione menu | ${menuParameters.length} | ${verifiedMenuParameters} | ${percent(verifiedMenuParameters, menuParameters.length)} |
| Controlli fisici (esclusa navigazione state-only) | ${physicalControls.length} | ${verifiedControls} | ${percent(verifiedControls, physicalControls.length)} |
| Sorgenti Mod | ${modulation.sources.length} | ${modulation.sources.filter((item) => itemStatus(item) === "verified").length} | ${percent(modulation.sources.filter((item) => itemStatus(item) === "verified").length, modulation.sources.length)} |
| Destinazioni Mod | ${modulation.destinations.length} | ${modulation.destinations.filter((item) => itemStatus(item) === "verified").length} | ${percent(modulation.destinations.filter((item) => itemStatus(item) === "verified").length, modulation.destinations.length)} |
| Sorgenti FX Mod | ${fxModulation.sources.length} | ${fxModulation.sources.filter((item) => itemStatus(item) === "verified").length} | ${percent(fxModulation.sources.filter((item) => itemStatus(item) === "verified").length, fxModulation.sources.length)} |
| Destinazioni FX Mod | ${fxModulation.destinations.length} | ${fxModulation.destinations.filter((item) => itemStatus(item) === "verified").length} | ${percent(fxModulation.destinations.filter((item) => itemStatus(item) === "verified").length, fxModulation.destinations.length)} |
| Mapping MIDI | ${midiCatalog.mappings.length} | ${verifiedMidiMappings} | ${percent(verifiedMidiMappings, midiCatalog.mappings.length)} |

I ${midiCatalog.nonControllable.length} parametri non presenti nella lista MIDI ufficiale sono registrati separatamente senza dedurne la non-controllabilità assoluta. I mapping MIDI “verificati” richiedono anche una traduzione verificata.

## Stato per catalogo

| Catalogo | Totale | verified | unverified | conflict | firmware-dependent | deprecated |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${statusRows}

## Copertura per sezione parametrica

| Sezione | Parametri | Verificati | Copertura |
| --- | ---: | ---: | ---: |
${sectionRows}

## Copertura per menu patch-relevant

| Menu | Entità catalogate | Verificate | Copertura | Fixture valida |
| --- | ---: | ---: | ---: | --- |
${menuRows}

La percentuale misura la quota con stato \`verified\`, non una stima della completezza del protocollo non pubblicato. Le entità \`firmware-dependent\` possono essere ufficiali ma restano escluse dalla quota verificata finché la versione firmware non è parte del contesto di validazione.
`;
}
