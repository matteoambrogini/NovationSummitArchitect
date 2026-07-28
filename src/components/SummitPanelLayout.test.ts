import { describe, expect, it } from "vitest";
import {
  panelRenderStats,
  SERIGRAPHY_LABEL_BASELINE_OFFSET,
  serigraphyLineStartX,
  summitPanelLayout,
} from "./SummitPanelLayout";

describe("photo-derived Summit panel layout", () => {
  it("keeps every registered control unique, in bounds and assigned to a section", () => {
    const viewBoxNumbers = summitPanelLayout.viewBox.split(" ").map(Number);
    const width = viewBoxNumbers[2] ?? 0;
    const height = viewBoxNumbers[3] ?? 0;
    const sectionIds = new Set(summitPanelLayout.sections.map((section) => section.id));
    const controlIds = new Set<string>();

    expect(summitPanelLayout.viewBox).toBe("0 0 1536 539");
    for (const control of summitPanelLayout.controls) {
      expect(controlIds.has(control.id)).toBe(false);
      controlIds.add(control.id);
      expect(sectionIds.has(control.sectionId)).toBe(true);
      expect(control.x).toBeGreaterThanOrEqual(0);
      expect(control.x).toBeLessThanOrEqual(width);
      expect(control.y).toBeGreaterThanOrEqual(0);
      expect(control.y).toBeLessThanOrEqual(height);
    }
  });

  it("registers every observed area button and hardware-wide element counts", () => {
    const areaIds = new Set(
      summitPanelLayout.controls.map((control) => control.displayAreaId).filter(Boolean),
    );
    expect(areaIds).toEqual(
      new Set([
        "osc",
        "env",
        "lfo",
        "arp-clock",
        "mod",
        "voice-filter",
        "fx",
        "fx-mod",
        "settings",
      ]),
    );
    expect(panelRenderStats.total).toBeGreaterThan(110);
    expect(panelRenderStats.physicalElements).toBe(panelRenderStats.total + 63);
  });

  it("stores photo-space landmarks and distinct silkscreen rows instead of section cards", () => {
    expect(summitPanelLayout.geometry).toMatchObject({
      referenceWidth: 1536,
      referenceHeight: 539,
      verifiedAt: "2026-07-28",
    });
    const landmarkIds = new Set(summitPanelLayout.landmarks.map((landmark) => landmark.id));
    for (const id of [
      "master",
      "display",
      "pitch-wheel",
      "mod-wheel",
      "voice",
      "arp",
      "oscillator-1",
      "oscillator-2",
      "oscillator-3",
      "filter",
      "amp-envelope",
      "mod-envelopes",
      "effects",
    ]) {
      expect(landmarkIds.has(id)).toBe(true);
    }
    const silkscreenIds = new Set(summitPanelLayout.serigraphy.map((mark) => mark.id));
    for (const id of [
      "oscillator-1",
      "oscillator-2",
      "oscillator-3",
      "distortion",
      "chorus",
      "delay",
      "effects",
      "reverb",
    ]) {
      expect(silkscreenIds.has(id)).toBe(true);
    }
  });

  it("keeps section titles above cyan rules with a measured exclusion gap", () => {
    expect(SERIGRAPHY_LABEL_BASELINE_OFFSET).toBeLessThan(0);
    for (const mark of summitPanelLayout.serigraphy) {
      const lineStart = serigraphyLineStartX(mark);
      expect(lineStart).toBeGreaterThanOrEqual(mark.x + 18);
      expect(lineStart).toBeLessThanOrEqual(mark.x + mark.width - 3);
    }
  });

  it("matches the calibrated display cluster and repeated control rows", () => {
    expect(summitPanelLayout.landmarks.find(({ id }) => id === "display")).toMatchObject({
      x: 183,
      y: 133,
      width: 110,
      height: 47,
    });
    expect(summitPanelLayout.controls.find(({ id }) => id === "menu-row-1")).toMatchObject({
      x: 164,
      y: 143,
    });
    expect(summitPanelLayout.controls.find(({ id }) => id === "menu-value")).toMatchObject({
      x: 312,
      y: 155,
    });
    for (const row of [1, 2, 3]) {
      const expectedY = [91, 157, 222][row - 1];
      expect(summitPanelLayout.controls.find(({ id }) => id === `osc${row}-coarse`)?.y).toBe(
        expectedY,
      );
    }
  });
});
