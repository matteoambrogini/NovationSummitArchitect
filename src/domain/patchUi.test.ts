import { describe, expect, it } from "vitest";
import { demoProposals } from "../ai/demoPatches";
import { parameterById } from "./catalog";
import {
  buildDefaultPartSettings,
  completeMatrixSlots,
  getMenuNavigation,
  isDefinitionVisible,
} from "./patchUi";

describe("catalog-backed patch UI helpers", () => {
  it("builds panel and menu state from catalog defaults", () => {
    const settings = buildDefaultPartSettings();
    expect(settings.panelControls.length).toBeGreaterThan(90);
    expect(settings.menuSettings.length).toBeGreaterThan(90);
    expect(settings.panelControls.every((setting) => parameterById.has(setting.parameterId))).toBe(
      true,
    );
  });

  it("filters Single and Multi-only definitions by scope", () => {
    const single = parameterById.get("osc1.wave")!;
    const multi = parameterById.get("multi.mode")!;
    expect(isDefinitionVisible(single, "single")).toBe(true);
    expect(isDefinitionVisible(multi, "single")).toBe(false);
    expect(isDefinitionVisible(multi, "multi-a")).toBe(true);
  });

  it("uses the full-video observed page without mutating parameter semantics", () => {
    const definition = parameterById.get("voice.spread")!;
    const navigation = getMenuNavigation(definition, "64")!;
    expect(navigation.verified).toBe(true);
    expect(navigation.menu).toBe("VOICE");
    expect(navigation.page).toBe(2);
    expect(navigation.pageRightPresses).toBe(1);
    expect(navigation.row).toBe(1);
    expect(navigation.uncertainty).toBeUndefined();
  });

  it("materializes all 16 Mod Matrix and 4 FX Mod Matrix slots", () => {
    const part = demoProposals[0]!.parts[0]!;
    const mod = completeMatrixSlots(part.modulationMatrix, "mod");
    const fx = completeMatrixSlots(part.fxModulationMatrix, "fx");
    expect(mod).toHaveLength(16);
    expect(fx).toHaveLength(4);
    expect(mod[0]?.depth).toBe(18);
    expect(mod[15]?.depth).toBe(0);
    expect(fx[0]?.destination).toBe("fx.chorus.level");
  });
});
