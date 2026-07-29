import { expect, test, type Page } from "@playwright/test";

async function openPhysicalPanel(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Apri Progressive House Pluck" }).click();
  await expect(
    page.getByRole("group", { name: "Pannello vettoriale interattivo Novation Summit" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Fit panel/i }).click();
}

async function scrollState(page: Page) {
  return {
    viewport: await page.locator(".panel-viewport").evaluate((element) => ({
      left: element.scrollLeft,
      top: element.scrollTop,
    })),
    page: await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
  };
}

test.describe("physical panel pointer hardening", () => {
  test("dragging and wheeling a knob change only its value", async ({ page }) => {
    await openPhysicalPanel(page);
    const viewport = page.locator(".panel-viewport");
    const frequency = page.getByRole("slider", { name: /^Frequency:/ });
    await frequency.click();
    await expect(page.getByText("◇ SALVATA")).toBeVisible();
    await expect(frequency).toBeFocused();
    const beforeDragValue = await frequency.getAttribute("aria-valuetext");
    const beforeDragScroll = await scrollState(page);
    const knob = await frequency.boundingBox();
    expect(knob).not.toBeNull();
    if (!knob) throw new Error("Frequency knob geometry unavailable");

    await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
    await page.mouse.down();
    await expect(viewport).toHaveAttribute("data-interaction-mode", "CONTROL");
    await expect(viewport).toHaveAttribute("data-active-control-interaction", "filter.frequency");
    await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2 - 35, {
      steps: 4,
    });
    expect(await scrollState(page)).toEqual(beforeDragScroll);
    await page.mouse.up();

    await expect(frequency).not.toHaveAttribute("aria-valuetext", beforeDragValue ?? "");
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe("");
    await expect(viewport).toHaveAttribute("data-interaction-mode", "INTERACT");

    const beforeWheelValue = await frequency.getAttribute("aria-valuetext");
    const beforeWheelScroll = await scrollState(page);
    await frequency.hover();
    await page.mouse.wheel(0, -80);
    await expect(frequency).not.toHaveAttribute("aria-valuetext", beforeWheelValue ?? "");
    expect(await scrollState(page)).toEqual(beforeWheelScroll);
  });

  test("background pans only with Space+left or the middle button", async ({ page }) => {
    await openPhysicalPanel(page);
    await page.getByRole("button", { name: "Zoom 150%" }).click();
    const viewport = page.locator(".panel-viewport");
    await viewport.evaluate((element) => {
      element.scrollLeft = 180;
      element.scrollTop = 80;
    });
    const bounds = await viewport.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error("Panel viewport geometry unavailable");
    const start = { x: bounds.x + 18, y: bounds.y + 18 };

    const beforePlainDrag = await scrollState(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 70, start.y - 35);
    await page.mouse.up();
    expect(await scrollState(page)).toEqual(beforePlainDrag);
    await expect(viewport).toHaveAttribute("data-interaction-mode", "INTERACT");

    await page.keyboard.down("Space");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(viewport).toHaveAttribute("data-interaction-mode", "PAN");
    await page.mouse.move(start.x - 70, start.y - 35);
    await page.mouse.up();
    await page.keyboard.up("Space");
    const afterSpacePan = await scrollState(page);
    expect(afterSpacePan.viewport.left).toBeGreaterThan(beforePlainDrag.viewport.left);
    expect(afterSpacePan.viewport.top).toBeGreaterThan(beforePlainDrag.viewport.top);

    const beforeMiddlePan = await scrollState(page);
    const whiteKey = await page.locator(".white-key").first().boundingBox();
    expect(whiteKey).not.toBeNull();
    if (!whiteKey) throw new Error("Keyboard background geometry unavailable");
    const middleStart = {
      x: whiteKey.x + whiteKey.width / 2,
      y: Math.min(whiteKey.y + 15, bounds.y + bounds.height - 18),
    };
    await page.mouse.move(middleStart.x, middleStart.y);
    await page.mouse.down({ button: "middle" });
    await expect(viewport).toHaveAttribute("data-interaction-mode", "PAN");
    await page.mouse.move(middleStart.x - 45, middleStart.y);
    await page.mouse.up({ button: "middle" });
    const afterMiddlePan = await scrollState(page);
    expect(afterMiddlePan.viewport.left).toBeGreaterThan(beforeMiddlePan.viewport.left);
    expect(afterMiddlePan.page).toEqual(beforeMiddlePan.page);
  });

  test("control drag locks pan and selection CSS stays scoped to hardware", async ({ page }) => {
    await openPhysicalPanel(page);
    await page.getByRole("button", { name: "Zoom 150%" }).click();
    const viewport = page.locator(".panel-viewport");
    await viewport.evaluate((element) => {
      element.scrollLeft = 400;
      element.scrollTop = 60;
    });
    const frequency = page.getByRole("slider", { name: /^Frequency:/ });
    await frequency.scrollIntoViewIfNeeded();
    const knob = await frequency.boundingBox();
    expect(knob).not.toBeNull();
    if (!knob) throw new Error("Frequency knob geometry unavailable");
    const before = await scrollState(page);

    await page.keyboard.down("Space");
    await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
    await page.mouse.down();
    await page.mouse.move(knob.x - 60, knob.y + knob.height / 2 - 20);
    expect(await scrollState(page)).toEqual(before);
    await expect(viewport).toHaveAttribute("data-interaction-mode", "CONTROL");
    await page.mouse.up();
    await page.keyboard.up("Space");

    expect(
      await page
        .locator(".summit-panel")
        .evaluate((element) => getComputedStyle(element).userSelect),
    ).toBe("none");
    expect(
      await page.locator(".inspector").evaluate((element) => getComputedStyle(element).userSelect),
    ).toBe("text");

    await page.getByRole("link", { name: "Display & menu" }).click();
    await page.getByRole("button", { name: /Modulation/ }).click();
    expect(
      await page
        .locator(".matrix-table")
        .first()
        .evaluate((element) => getComputedStyle(element).userSelect),
    ).toBe("text");
  });

  test("section headers enforce line, label and bounded-content hierarchy", async ({ page }) => {
    await openPhysicalPanel(page);

    const conflicts = await page.locator(".panel-section-header").evaluateAll((headers) => {
      const allText = [...document.querySelectorAll(".panel-vector-layer text")].filter(
        (element): element is SVGTextElement => element instanceof SVGTextElement,
      );
      const allControls = [...document.querySelectorAll("[data-layout-control-id]")].filter(
        (element): element is SVGGElement => element instanceof SVGGElement,
      );
      const intersects = (
        left: { x: number; y: number; width: number; height: number },
        right: { x: number; y: number; width: number; height: number },
        padding = 0,
      ) =>
        left.x < right.x + right.width + padding &&
        left.x + left.width + padding > right.x &&
        left.y < right.y + right.height + padding &&
        left.y + left.height + padding > right.y;
      const visibleControlBounds = (control: SVGGElement) => {
        const visibleElements = [
          ...control.querySelectorAll<SVGGraphicsElement>(
            "circle, ellipse, line, path, polygon, polyline, rect, text",
          ),
        ].filter((element) => {
          const style = getComputedStyle(element);
          return (
            !element.classList.contains("control-hit-target") &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        });
        if (visibleElements.length === 0) return undefined;
        const boxes = visibleElements.map((element) => element.getBBox());
        const left = Math.min(...boxes.map((box) => box.x));
        const top = Math.min(...boxes.map((box) => box.y));
        const right = Math.max(...boxes.map((box) => box.x + box.width));
        const bottom = Math.max(...boxes.map((box) => box.y + box.height));
        return { x: left, y: top, width: right - left, height: bottom - top };
      };

      return headers.flatMap((header) => {
        const id = header.getAttribute("data-section-header-id");
        const line = header.querySelector(".panel-section-header-line");
        const label = header.querySelector(".panel-section-header-label");
        const contentTop = Number(header.getAttribute("data-content-top-y"));
        if (
          !id ||
          !(line instanceof SVGLineElement) ||
          !(label instanceof SVGTextElement) ||
          !Number.isFinite(contentTop)
        ) {
          return [`${id ?? "unknown"}:header-structure`];
        }

        const issues: string[] = [];
        const labelBounds = label.getBBox();
        const lineStart = line.x1.baseVal.value;
        const lineEnd = line.x2.baseVal.value;
        const lineY = line.y1.baseVal.value;
        if (labelBounds.y <= lineY + 1) issues.push("label-not-below-line");
        if (contentTop <= labelBounds.y + labelBounds.height + 1) {
          issues.push("contentTop-without-label-margin");
        }

        const memberControls = [
          ...document.querySelectorAll(`[data-layout-control-id][data-section-header-id="${id}"]`),
        ].filter(
          (element): element is SVGGElement =>
            element instanceof SVGGElement && element.hasAttribute("data-layout-control-id"),
        );
        for (const control of memberControls) {
          const controlBounds = visibleControlBounds(control);
          if (!controlBounds) continue;
          const controlId = control.getAttribute("data-layout-control-id") ?? "unknown-control";
          if (
            controlBounds.x < lineStart - 0.5 ||
            controlBounds.x + controlBounds.width > lineEnd + 0.5
          ) {
            issues.push(`${controlId}:outside-line`);
          }
          if (intersects(labelBounds, controlBounds, 1)) {
            issues.push(`${controlId}:label-control-intersection`);
          }
        }

        const lineBounds = {
          x: lineStart,
          y: lineY - 0.4,
          width: lineEnd - lineStart,
          height: 0.8,
        };
        for (const text of allText) {
          if (intersects(lineBounds, text.getBBox())) {
            issues.push(`line-text-intersection:${text.textContent?.trim() ?? "text"}`);
          }
        }
        for (const control of allControls) {
          const controlBounds = visibleControlBounds(control);
          if (controlBounds && intersects(lineBounds, controlBounds)) {
            issues.push(
              `line-control-intersection:${control.getAttribute("data-layout-control-id") ?? "control"}`,
            );
          }
        }
        return issues.map((issue) => `${id}:${issue}`);
      });
    });

    expect(conflicts).toEqual([]);
  });
});
