import { describe, expect, it } from "vitest";
import {
  layoutControlHorizontalBounds,
  panelRenderStats,
  sectionHeadersForControl,
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

  it("stores photo-space landmarks and explicit section-header geometry", () => {
    expect(summitPanelLayout.geometry).toMatchObject({
      referenceWidth: 1536,
      referenceHeight: 539,
      verifiedAt: "2026-07-29",
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
    const sectionHeaderIds = new Set(summitPanelLayout.sectionHeaders.map((header) => header.id));
    for (const id of [
      "master",
      "menu",
      "voice",
      "arp",
      "oscillator-1",
      "oscillator-2",
      "oscillator-3",
      "fm",
      "mixer",
      "filter",
      "amp-envelope",
      "mod-envelopes",
      "lfo-1",
      "lfo-2",
      "global-lfo",
      "distortion",
      "chorus",
      "delay",
      "effects",
      "reverb",
    ]) {
      expect(sectionHeaderIds.has(id)).toBe(true);
    }
    expect(sectionHeaderIds.size).toBe(24);
  });

  it("orders every section as full cyan segment, label below, then bounded content", () => {
    for (const header of summitPanelLayout.sectionHeaders) {
      expect(header.headerLineEndX).toBeGreaterThan(header.headerLineStartX);
      expect(header.labelY - 5).toBeGreaterThan(header.headerY + 1);
      expect(header.contentTopY).toBeGreaterThan(header.labelY + 2);
      expect(header.contentBounds).toMatchObject({
        x: header.headerLineStartX,
        y: header.contentTopY,
        width: header.headerLineEndX - header.headerLineStartX,
      });
    }
  });

  it("assigns every deck control to one header and keeps its visual bounds inside the segment", () => {
    for (const control of summitPanelLayout.controls.filter(({ y }) => y < 285)) {
      const headers = sectionHeadersForControl(control);
      expect(headers, control.id).toHaveLength(1);
      const header = headers[0];
      const bounds = layoutControlHorizontalBounds(control);
      expect(bounds.left, control.id).toBeGreaterThanOrEqual(header?.headerLineStartX ?? Infinity);
      expect(bounds.right, control.id).toBeLessThanOrEqual(header?.headerLineEndX ?? -Infinity);
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
      const expectedY = [96, 161, 226][row - 1];
      expect(summitPanelLayout.controls.find(({ id }) => id === `osc${row}-coarse`)?.y).toBe(
        expectedY,
      );
    }
  });
});
