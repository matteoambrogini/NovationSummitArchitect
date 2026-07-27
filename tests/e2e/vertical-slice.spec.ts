import { expect, test } from "@playwright/test";

test("demo, pannello, patch state, menu, matrici e Setup Mode restano sincronizzati", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dal carattere sonoro/ })).toBeVisible();

  await page.getByRole("link", { name: "Apri Progressive House Pluck" }).click();
  await expect(page.getByRole("heading", { name: "Prog House Plk" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Pannello vettoriale interattivo Novation Summit" }),
  ).toBeVisible();
  const physicalOled = page.getByTestId("panel-oled");
  await expect(physicalOled).toBeVisible();
  await page.getByRole("button", { name: /Fit panel/i }).click();
  await page.screenshot({
    path: "tmp/visual-qa/summit-fit-panel.png",
    fullPage: true,
  });

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
  await page.setViewportSize({ width: 1440, height: 900 });
  const panelViewportBox = await page.locator(".panel-viewport").boundingBox();
  const panelCanvasBox = await page.locator(".panel-canvas").boundingBox();
  expect(panelViewportBox).not.toBeNull();
  expect(panelCanvasBox).not.toBeNull();
  if (!panelViewportBox || !panelCanvasBox) throw new Error("Geometria pannello non disponibile");
  expect(panelCanvasBox.width).toBeLessThanOrEqual(panelViewportBox.width + 1);

  await page.getByRole("button", { name: "OSC: controllo menu hardware" }).click();
  await expect(physicalOled).toHaveAttribute("data-display-area", "osc");
  await expect(physicalOled).toHaveAttribute("data-display-page", "1");
  await page.screenshot({ path: "tmp/visual-qa/oled-osc-1.png", fullPage: true });
  const physicalPageRight = page.getByRole("button", {
    name: "PAGE ▶: controllo menu hardware",
  });
  await physicalPageRight.click();
  await expect(physicalOled).toHaveAttribute("data-display-page", "2");
  await page.screenshot({ path: "tmp/visual-qa/oled-osc-2.png", fullPage: true });
  await physicalPageRight.click();
  await expect(physicalOled).toHaveAttribute("data-display-page", "3");
  await page.screenshot({ path: "tmp/visual-qa/oled-osc-3.png", fullPage: true });

  const selectedOledRow = physicalOled.getByRole("button").first();
  await selectedOledRow.click();
  const valueEncoder = page.getByRole("slider", { name: /^Value:/ });
  const valueBefore = await valueEncoder.getAttribute("aria-valuetext");
  await valueEncoder.press("ArrowUp");
  await expect(valueEncoder).not.toHaveAttribute("aria-valuetext", valueBefore ?? "");
  await expect(page.getByText(/Patch modificata/)).toBeVisible();

  const frequency = page.getByRole("slider", { name: "Frequency: 185" });
  await frequency.focus();
  await frequency.press("ArrowDown");
  await expect(page.getByRole("slider", { name: "Frequency: 184" })).toBeVisible();
  await expect(page.getByText(/Patch modificata/)).toBeVisible();

  await page.getByText("Patch JSON sincronizzato").click();
  await expect(page.getByTestId("patch-json")).toContainText('"filter.frequency": 184');

  await page.getByRole("link", { name: "Display & menu" }).click();
  await expect(page.getByRole("heading", { name: "Display, percorsi e checklist" })).toBeVisible();
  await expect(page.getByText("OSC · 3/9")).toBeVisible();

  await page.getByRole("button", { name: /LFO.*10 pagine/ }).click();
  await page.getByRole("button", { name: "Pagina 10" }).click();
  await expect(page.getByText("LFO 4", { exact: true })).toBeVisible();
  await expect(page.getByText(/PAGE ▶ × 9/).first()).toBeVisible();
  await page.screenshot({ path: "tmp/visual-qa/display-browser.png", fullPage: true });

  await page.getByRole("link", { name: "Pannello fisico" }).click();
  await expect(page.getByTestId("panel-oled")).toHaveAttribute("data-display-area", "lfo");
  await expect(page.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "10");
  await page.getByRole("button", { name: "Zoom 125%" }).click();
  await page.locator(".panel-viewport").hover();
  await page.mouse.wheel(420, 0);
  await page.screenshot({
    path: "tmp/visual-qa/summit-zoom-125.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Zoom 150%" }).click();
  await page.locator(".panel-viewport").hover();
  await page.mouse.wheel(180, 0);
  await page.screenshot({
    path: "tmp/visual-qa/summit-zoom-150.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Display & menu" }).click();

  await page.getByRole("button", { name: /Patch checklist/ }).click();
  await expect(page.getByRole("heading", { name: /Prog House Plk/ })).toBeVisible();
  expect(await page.locator(".patch-checklist li").count()).toBeGreaterThan(180);
  await page.screenshot({ path: "tmp/visual-qa/checklist.png", fullPage: true });

  await page.getByRole("button", { name: /Modulation/ }).click();
  await expect(page.getByRole("heading", { name: "Mod Matrix", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FX Mod Matrix" })).toBeVisible();
  await expect(page.locator(".matrix-table").first().locator("tbody tr")).toHaveCount(16);
  await expect(page.locator(".matrix-table").nth(1).locator("tbody tr")).toHaveCount(4);
  await page.screenshot({ path: "tmp/visual-qa/modulation.png", fullPage: true });

  await page.getByRole("link", { name: "Pannello fisico" }).click();
  await page.getByRole("button", { name: "Configura il Summit" }).click();
  const setupRegion = page.getByRole("region", { name: "Setup Mode" });
  await expect(setupRegion).toBeVisible();
  await page.getByRole("button", { name: "Menu / matrici" }).click();
  await expect(setupRegion).toContainText("DISPLAY");
  await expect(page.getByRole("button", { name: "Successivo →" })).toBeVisible();
  await page.getByRole("button", { name: "Successivo →" }).click();
  await page.getByRole("button", { name: "Salta" }).click();
  await page.getByRole("button", { name: "← Precedente" }).click();
  await page.getByRole("button", { name: "Mostra overlay" }).click();
  await expect(page.getByRole("button", { name: "Nascondi overlay" })).toBeVisible();
  await page.screenshot({ path: "tmp/visual-qa/setup-mode.png", fullPage: true });
});
