import { expect, test } from "@playwright/test";

test("demo, pannello, patch state, menu, matrici e Setup Mode restano sincronizzati", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Dal carattere sonoro/ }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Apri Progressive House Pluck" })
    .click();
  await expect(page.getByRole("heading", { name: "Prog House Plk" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Pannello vettoriale interattivo Novation Summit" }),
  ).toBeVisible();

  for (const [name, width, height] of [
    ["1920x1080", 1920, 1080],
    ["2560x1440", 2560, 1440],
    ["1440x900", 1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: `tmp/visual-qa/panel-${name}.png`,
      fullPage: true,
    });
  }

  const frequency = page.getByRole("slider", { name: "Frequency: 185" });
  await frequency.focus();
  await frequency.press("ArrowDown");
  await expect(
    page.getByRole("slider", { name: "Frequency: 184" }),
  ).toBeVisible();
  await expect(page.getByText(/Patch modificata/)).toBeVisible();

  await page.getByText("Patch JSON sincronizzato").click();
  await expect(page.getByTestId("patch-json")).toContainText(
    '"filter.frequency": 184',
  );

  await page.getByRole("link", { name: "Display & menu" }).click();
  await expect(
    page.getByRole("heading", { name: "Display, percorsi e matrici" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Oscillator Drift" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Parameter Table/ }).click();
  const driftRow = page.getByRole("row", { name: /Oscillator Drift/ });
  await driftRow.scrollIntoViewIfNeeded();
  await expect(driftRow).toBeVisible();
  await expect(driftRow.getByRole("cell", { name: "7", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Modulation/ }).click();
  await expect(page.getByRole("heading", { name: "Mod Matrix", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FX Mod Matrix" })).toBeVisible();
  await expect(page.locator(".matrix-table").first().locator("tbody tr")).toHaveCount(16);
  await expect(page.locator(".matrix-table").nth(1).locator("tbody tr")).toHaveCount(4);
  await page.screenshot({ path: "tmp/visual-qa/modulation.png", fullPage: true });

  await page.getByRole("link", { name: "Pannello fisico" }).click();
  await page.getByRole("button", { name: "Configura il Summit" }).click();
  await expect(page.getByLabel("Setup Mode")).toBeVisible();
  await expect(page.getByRole("button", { name: "Successivo →" })).toBeVisible();
  await page.getByRole("button", { name: "Successivo →" }).click();
  await page.getByRole("button", { name: "Salta" }).click();
  await page.getByRole("button", { name: "← Precedente" }).click();
  await page.screenshot({ path: "tmp/visual-qa/setup-mode.png", fullPage: true });
});
