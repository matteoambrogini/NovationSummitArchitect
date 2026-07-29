import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { displayLocationByParameterId, displayStructure, parameterById } from "./catalog";
import { buildPatchSetupChecklist } from "./displayStructure";

describe("firmware 2.1 display structure", () => {
  it("models the complete observed pass with stable counts", () => {
    const pages = displayStructure.areas.flatMap((area) => area.pages);
    const fields = pages.flatMap((page) => page.fields);
    const mappedFields = fields.filter((field) => field.parameterId);
    const slotCount = displayStructure.areas.reduce(
      (total, area) => total + (area.slotCount ?? 0),
      0,
    );

    expect(pages).toHaveLength(45);
    expect(fields).toHaveLength(119);
    expect(mappedFields).toHaveLength(116);
    expect(displayLocationByParameterId.size).toBe(116);
    expect(slotCount).toBe(20);
  });

  it("keeps every mapped display field catalog-backed and every area ordered", () => {
    for (const area of displayStructure.areas) {
      expect(new Set(area.pages.map((page) => page.page)).size).toBe(area.pages.length);
      area.pages.forEach((page, pageIndex) => {
        expect(page.page).toBe(pageIndex + 1);
        page.fields.forEach((field, fieldIndex) => {
          expect(field.line).toBe(fieldIndex + 1);
          if (field.parameterId) expect(parameterById.has(field.parameterId)).toBe(true);
          else expect(field.unmappedReason).toBeTruthy();
        });
      });
    }
  });

  it("keeps Settings global and untraversed", () => {
    const settings = displayStructure.areas.find((area) => area.id === "settings");
    expect(settings).toMatchObject({
      kind: "unobserved",
      patchRelevant: false,
      verificationStatus: "not-traversed",
    });
    expect(settings?.pages).toHaveLength(0);
  });
});

describe("generated patch setup checklist", () => {
  it("covers physical controls, menu fields and all matrix slots without globals", () => {
    const proposal = demoProposals[0]!;
    const all = buildPatchSetupChecklist(proposal, "single");
    const physical = buildPatchSetupChecklist(proposal, "single", "physical");
    const menu = buildPatchSetupChecklist(proposal, "single", "menu");
    const matrix = menu.filter((item) => item.slot !== undefined);

    expect(all).toHaveLength(physical.length + menu.length);
    expect(physical.length).toBeGreaterThan(80);
    expect(menu.length).toBeGreaterThan(100);
    expect(matrix).toHaveLength(20);
    expect(
      all
        .flatMap((item) => item.parameterIds)
        .every((parameterId) => parameterById.get(parameterId)?.scope !== "global"),
    ).toBe(true);
  });

  it("produces exact observed PAGE-right navigation", () => {
    const proposal = demoProposals[0]!;
    const lfo4Fade = buildPatchSetupChecklist(proposal, "single").find(
      (item) => item.id === "parameter:lfo4.fadeTime",
    );
    expect(lfo4Fade).toMatchObject({
      kind: "menu",
      areaId: "lfo",
      page: 10,
      row: 3,
    });
    expect(lfo4Fade?.instruction).toContain("PAGE > 9 volte");
  });
});
