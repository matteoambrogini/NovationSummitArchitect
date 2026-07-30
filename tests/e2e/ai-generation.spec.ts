import { expect, test } from "@playwright/test";

test("the browser UI never receives credentials and routes generation to Tauri", async ({
  page,
}) => {
  await page.goto("/new");
  await expect(page.getByRole("heading", { name: "Che suono vuoi costruire?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Genera patch con OpenAI/ })).toBeVisible();

  await page.getByLabel("Descrizione sonora").fill("Pad caldo, lento e molto ampio");
  await page.getByRole("button", { name: /Genera patch con OpenAI/ }).click();

  await expect(
    page.locator(".generation-status").filter({
      hasText: /disponibile nell'app desktop Tauri/i,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/new$/);

  await page.getByRole("link", { name: "Impostazioni" }).click();
  await expect(page.getByLabel("Provider attivo")).toHaveValue("openai");
  await expect(page.getByLabel(/api key/i)).toHaveCount(0);
});
