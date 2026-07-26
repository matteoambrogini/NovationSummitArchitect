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

const errors = [];
const ids = new Set();
for (const parameter of parameters) {
  if (ids.has(parameter.id)) errors.push(`ID duplicato: ${parameter.id}`);
  ids.add(parameter.id);
  if (!parameter.documentation?.document || !parameter.documentation?.section || !parameter.documentation?.sourceUrl || !parameter.documentation?.verifiedAt) errors.push(`Riferimento incompleto: ${parameter.id}`);
  if (parameter.minimum !== undefined && parameter.maximum !== undefined && parameter.minimum > parameter.maximum) errors.push(`Range invertito: ${parameter.id}`);
  if (parameter.valueType === "enum" && !parameter.enumValues?.length) errors.push(`Enum vuoto: ${parameter.id}`);
  if (parameter.location?.type === "menu" && !parameter.location.page) errors.push(`Pagina menu mancante: ${parameter.id}`);
}

for (const control of layout.controls) {
  const parameter = parameters.find((candidate) => candidate.id === control.parameterId);
  if (!parameter) errors.push(`Controllo UI senza parametro: ${control.id}`);
  else if (parameter.location.type !== "panel") errors.push(`Controllo UI mappa un parametro menu: ${control.id}`);
}

for (const parameter of parameters.filter((candidate) => candidate.location.type === "panel")) {
  if (!layout.controls.some((control) => control.parameterId === parameter.id)) errors.push(`Parametro pannello senza controllo UI: ${parameter.id}`);
}

for (const menu of menuCatalog.menus) {
  for (const id of menu.parameterIds) {
    const parameter = parameters.find((candidate) => candidate.id === id);
    if (!parameter) errors.push(`Menu ${menu.id} riferisce parametro assente: ${id}`);
    else if (parameter.location.type !== "menu") errors.push(`Menu ${menu.id} riferisce parametro pannello: ${id}`);
  }
}

for (const catalog of [modulation, fxModulation]) {
  const sourceIds = new Set();
  for (const source of catalog.sources) {
    if (sourceIds.has(source.id)) errors.push(`Sorgente modulazione duplicata: ${source.id}`);
    sourceIds.add(source.id);
  }
  const destinationIds = new Set();
  for (const destination of catalog.destinations) {
    if (destinationIds.has(destination.id)) errors.push(`Destinazione modulazione duplicata: ${destination.id}`);
    destinationIds.add(destination.id);
    if (!ids.has(destination.id)) errors.push(`Destinazione senza parametro: ${destination.id}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Cataloghi validi: ${parameters.length} parametri, ${layout.controls.length} controlli UI, ${menuCatalog.menus.length} menu verificati.`);
