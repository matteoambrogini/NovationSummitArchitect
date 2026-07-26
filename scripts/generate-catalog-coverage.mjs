import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import prettier from "prettier";
import { renderCatalogCoverage } from "./catalog-coverage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "docs/summit-catalog-coverage.md");
const expected = await prettier.format(await renderCatalogCoverage(root), {
  parser: "markdown",
});

if (process.argv.includes("--check")) {
  let actual;
  try {
    actual = await readFile(outputPath, "utf8");
  } catch {
    console.error("Report di copertura mancante: eseguire pnpm catalog:coverage");
    process.exit(1);
  }
  if (actual !== expected) {
    console.error("Report di copertura non aggiornato: eseguire pnpm catalog:coverage");
    process.exit(1);
  }
  console.log("Report di copertura aggiornato.");
} else {
  await writeFile(outputPath, expected);
  console.log(`Report di copertura generato: ${path.relative(root, outputPath)}`);
}
