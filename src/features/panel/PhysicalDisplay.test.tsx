import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MenusPage } from "../menus/MenusPage";
import { getSetting } from "../../domain/patchUi";
import { selectActiveProposal, useAppStore } from "../../stores/useAppStore";
import { PhysicalPanelPage } from "./PhysicalPanelPage";

function renderPanel() {
  return render(
    <MemoryRouter>
      <PhysicalPanelPage />
    </MemoryRouter>,
  );
}

function renderMenus() {
  return render(
    <MemoryRouter>
      <MenusPage />
    </MemoryRouter>,
  );
}

describe("physical display navigation", () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAppStore.getState().loadDemo("progressive-house-pluck");
  });

  it("navigates area and page from the physical buttons without overflowing", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "OSC: controllo menu hardware" }));
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-area", "osc");
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "1");

    const pageRight = screen.getByRole("button", {
      name: "PAGE ▶: controllo menu hardware",
    });
    fireEvent.click(pageRight);
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "2");

    for (let index = 0; index < 20; index += 1) fireEvent.click(pageRight);
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "9");

    const pageLeft = screen.getByRole("button", {
      name: "PAGE ◀: controllo menu hardware",
    });
    fireEvent.click(pageLeft);
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "8");
    for (let index = 0; index < 20; index += 1) fireEvent.click(pageLeft);
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "1");

    fireEvent.click(screen.getByRole("button", { name: "LFO: controllo menu hardware" }));
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-area", "lfo");
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "1");
  });

  it("selects an OLED row and edits the same patch parameter with Value", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "OSC: controllo menu hardware" }));
    fireEvent.click(screen.getByRole("button", { name: /^Diverge:/ }));
    expect(useAppStore.getState().selectedParameterId).toBe("osc.common.diverge");

    const before = getSetting(
      selectActiveProposal(useAppStore.getState())!,
      "osc.common.diverge",
      "single",
    )?.value;
    const valueEncoder = screen.getByRole("slider", { name: /^Value:/ });
    fireEvent.keyDown(valueEncoder, { key: "ArrowUp" });
    const after = getSetting(
      selectActiveProposal(useAppStore.getState())!,
      "osc.common.diverge",
      "single",
    )?.value;
    expect(typeof before).toBe("number");
    expect(after).toBe(Number(before) + 1);
  });

  it("keeps physical panel and advanced menu browser on the same area and page", () => {
    const panel = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "ENV: controllo menu hardware" }));
    fireEvent.click(screen.getByRole("button", { name: "PAGE ▶: controllo menu hardware" }));
    panel.unmount();

    const menus = renderMenus();
    expect(screen.getByText("ENV · 2/8")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /LFO10 pagine/ }));
    fireEvent.click(screen.getByRole("button", { name: "Pagina successiva" }));
    menus.unmount();

    renderPanel();
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-area", "lfo");
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-page", "2");
  });

  it("navigates every MOD and FX MOD slot with shared bounded state", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "MOD: controllo menu hardware" }));
    fireEvent.click(screen.getByRole("button", { name: /^Depth:/ }));
    const depthBefore =
      selectActiveProposal(useAppStore.getState())!.parts[0]!.modulationMatrix.find(
        (assignment) => assignment.slot === 1,
      )?.depth ?? 0;
    fireEvent.keyDown(screen.getByRole("slider", { name: /^Value:/ }), {
      key: "ArrowUp",
    });
    expect(
      selectActiveProposal(useAppStore.getState())!.parts[0]!.modulationMatrix.find(
        (assignment) => assignment.slot === 1,
      )?.depth,
    ).toBe(depthBefore + 1);
    const next = screen.getByRole("button", {
      name: "PAGE ▶: controllo menu hardware",
    });
    for (let index = 0; index < 20; index += 1) fireEvent.click(next);
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-slot", "16");
    expect(useAppStore.getState().activeModulationSlot).toBe(16);

    fireEvent.click(screen.getByRole("button", { name: "FX MOD: controllo menu hardware" }));
    for (let index = 0; index < 10; index += 1) fireEvent.click(next);
    expect(screen.getByTestId("panel-oled")).toHaveAttribute("data-display-slot", "4");
    expect(useAppStore.getState().activeFxModulationSlot).toBe(4);
  });
});
