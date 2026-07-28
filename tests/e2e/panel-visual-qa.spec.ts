import { expect, test, type Page } from "@playwright/test";

const outputDirectory = "docs/qa/summit-operational-map";

async function openPhysicalPanel(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Apri Progressive House Pluck" }).click();
  await expect(
    page.getByRole("group", { name: "Pannello vettoriale interattivo Novation Summit" }),
  ).toBeVisible();
}

async function screenshotReferenceRegion(
  page: Page,
  region: { x: number; y: number; width: number; height: number },
  path: string,
) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const panel = await page.locator(".summit-panel").boundingBox();
  if (!panel) throw new Error("Panel geometry unavailable");
  const scaleX = panel.width / 1536;
  const scaleY = panel.height / 539;
  await page.screenshot({
    path: `${outputDirectory}/${path}`,
    clip: {
      x: panel.x + region.x * scaleX,
      y: panel.y + region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
    },
  });
}

test("capture calibrated Summit panel visual evidence", async ({ page }) => {
  test.skip(process.env.UPDATE_VISUAL_QA !== "1", "Set UPDATE_VISUAL_QA=1 to refresh evidence");
  await openPhysicalPanel(page);
  await page.getByRole("button", { name: /Fit panel/i }).click();
  await page.screenshot({
    path: `${outputDirectory}/final-fit-panel.png`,
    fullPage: true,
  });

  await page.setViewportSize({ width: 3000, height: 1400 });
  await page.addStyleTag({
    content:
      ".panel-card, .panel-viewport { overflow: visible !important; } .panel-viewport { height: 840px !important; max-height: none !important; }",
  });
  await page.getByRole("button", { name: "Zoom 150%" }).click();
  await page.locator(".summit-panel").screenshot({
    path: "/private/tmp/summit-vector-150.png",
  });
  await screenshotReferenceRegion(
    page,
    { x: 300, y: 48, width: 180, height: 92 },
    "voice-area-150.png",
  );
  await screenshotReferenceRegion(
    page,
    { x: 452, y: 48, width: 585, height: 224 },
    "osc-filter-area-150.png",
  );
  await screenshotReferenceRegion(
    page,
    { x: 1012, y: 48, width: 305, height: 224 },
    "envelopes-lfo-area-150.png",
  );
  await screenshotReferenceRegion(
    page,
    { x: 1286, y: 48, width: 198, height: 224 },
    "effects-area-150.png",
  );

  await page.getByRole("button", { name: "OSC: controllo menu hardware" }).click();
  await page.getByRole("button", { name: /^Diverge:/ }).click();
  await screenshotReferenceRegion(
    page,
    { x: 154, y: 126, width: 132, height: 62 },
    "oled-row-highlight.png",
  );

  await page.getByRole("button", { name: "Apri calibrazione" }).click();
  await expect(page.getByTestId("calibration-reference-photo")).toBeVisible();
  await page.locator(".summit-panel").screenshot({
    path: "/private/tmp/summit-overlay-150.png",
  });
  await screenshotReferenceRegion(
    page,
    { x: 300, y: 48, width: 180, height: 92 },
    "reference-overlay-voice.png",
  );
  await screenshotReferenceRegion(
    page,
    { x: 300, y: 48, width: 180, height: 92 },
    "voice-reference-vs-vector.png",
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: /Fit panel/i }).click();
  await page.locator(".summit-panel").screenshot({
    path: `${outputDirectory}/reference-overlay-full-panel.png`,
  });
});
