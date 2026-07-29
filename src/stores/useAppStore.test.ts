import { beforeEach, describe, expect, it } from "vitest";
import { getSetting } from "../domain/patchUi";
import {
  selectActiveProposal,
  selectIsDirty,
  useAppStore,
} from "./useAppStore";

describe("unified patch state", () => {
  beforeEach(() => {
    useAppStore.getState().loadDemo("progressive-house-pluck");
  });

  it("updates the active patch, history, dirty state and every consumer selector", () => {
    useAppStore.getState().setParameterValue("filter.frequency", 150);
    const state = useAppStore.getState();
    const active = selectActiveProposal(state)!;
    expect(getSetting(active, "filter.frequency", "single")?.value).toBe(150);
    expect(state.proposals).toHaveLength(2);
    expect(selectIsDirty(state)).toBe(true);
    expect(state.statusMessage).toMatch(/non salvato/);
  });

  it("rejects invalid values without mutating patch state", () => {
    expect(() =>
      useAppStore.getState().setParameterValue("filter.frequency", 999),
    ).toThrow(/massimo 255/);
    expect(useAppStore.getState().proposals).toHaveLength(1);
  });

  it("switches coherently between Single, Multi A and Multi B", () => {
    useAppStore.getState().setActiveScope("multi-b");
    let state = useAppStore.getState();
    let active = selectActiveProposal(state)!;
    expect(active.patch.mode).toBe("multi");
    expect(active.parts.map((part) => part.part)).toEqual(["A", "B"]);
    expect(active.multiSetup?.panelControls[0]?.parameterId).toBe("multi.mode");
    expect(state.activeScope).toBe("multi-b");

    state.setActiveScope("single");
    state = useAppStore.getState();
    active = selectActiveProposal(state)!;
    expect(active.patch.mode).toBe("single");
    expect(active.parts).toHaveLength(1);
    expect(active.multiSetup).toBeUndefined();
  });

  it("supports Setup Mode previous, next, skip and default filtering", () => {
    const state = useAppStore.getState();
    state.toggleSetupMode();
    expect(useAppStore.getState().setupMode).toBe(true);
    state.nextSetupStep();
    expect(useAppStore.getState().setupStep).toBe(1);
    state.previousSetupStep();
    expect(useAppStore.getState().setupStep).toBe(0);
    state.skipSetupStep();
    expect(useAppStore.getState().setupStep).toBe(1);
    state.toggleSetupOnlyModified();
    expect(useAppStore.getState().setupOnlyModified).toBe(false);
  });
});
