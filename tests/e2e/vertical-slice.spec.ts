import { expect, test } from "@playwright/test";

test("completa il flusso demo principale", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dal carattere sonoro/ })).toBeVisible();
  await page.screenshot({ path: "tmp/visual-qa/home.png", fullPage: true });
  await page.getByRole("link", { name: /Crea un nuovo suono/ }).click();
  await expect(page.getByRole("heading", { name: /Che suono vuoi costruire/ })).toBeVisible();
  await page.getByLabel("Descrizione sonora").fill(
    "Pluck progressive-house brillante, corto e largo con un filtro leggermente scuro",
  );
  await page.getByRole("button", { name: /Genera proposta demo/ }).click();
  await expect(page.getByRole("heading", { name: "Aurora Pluck" })).toBeVisible();
  await page.screenshot({ path: "tmp/visual-qa/panel.png", fullPage: true });
  await page.getByRole("button", { name: /Frequency:/ }).click();
  await expect(page.getByRole("heading", { name: "Filter Frequency" })).toBeVisible();
  await page.getByLabel("Modifica manuale").fill("150");
  await expect(page.getByText(/Modifica manuale salvata/)).toBeVisible();
  await page.getByRole("link", { name: "Display & menu" }).click();
  await expect(page.getByRole("heading", { name: /Configurazione oltre il pannello/ })).toBeVisible();
  await page.screenshot({ path: "tmp/visual-qa/menus.png", fullPage: true });
  await page.getByLabel("Istruzione di raffinamento").fill("Rendila più scura");
  await page.getByRole("button", { name: "Applica delta" }).click();
  await expect(page.getByText(/Delta applicato/)).toBeVisible();
  await page.getByRole("link", { name: "Confronta" }).click();
  await expect(page.getByText("Filter Frequency", { exact: true })).toBeVisible();
  await page.screenshot({ path: "tmp/visual-qa/compare.png", fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salva" }).click();
  const download = await downloadPromise;
  const savedProjectPath = await download.path();
  expect(savedProjectPath).not.toBeNull();
  if (!savedProjectPath) throw new Error("Playwright non ha restituito il file progetto salvato");

  await page.close();
  const reopenedPage = await context.newPage();
  await reopenedPage.goto("/");
  await expect(reopenedPage.getByText("Nessuna patch", { exact: true })).toBeVisible();
  const fileChooserPromise = reopenedPage.waitForEvent("filechooser");
  await reopenedPage.getByRole("button", { name: "Apri" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(savedProjectPath);
  await expect(reopenedPage.getByText(/Progetto aperto:/)).toBeVisible();
  await expect(
    reopenedPage.getByRole("banner").getByText("Aurora Pluck R", { exact: true }),
  ).toBeVisible();
  await reopenedPage.getByRole("link", { name: "Pannello fisico" }).click();
  await expect(reopenedPage.getByRole("heading", { name: "Aurora Pluck R" })).toBeVisible();
  await expect(reopenedPage.getByRole("button", { name: "Frequency: 128" })).toBeVisible();
  await reopenedPage.screenshot({ path: "tmp/visual-qa/reopened-project.png", fullPage: true });
});
