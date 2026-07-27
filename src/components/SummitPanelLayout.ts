import layoutJson from "../data/summit-control-layout.json";

export type LayoutControl = {
  id: string;
  parameterId?: string;
  parameterIds?: string[];
  label: string;
  type: "knob" | "slider" | "selector" | "button" | "toggle" | "encoder" | "led";
  x: number;
  y: number;
  size?: number;
  stateOnly?: boolean;
};

export type LayoutSection = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const summitPanelLayout = layoutJson as {
  viewBox: string;
  sections: LayoutSection[];
  controls: LayoutControl[];
};

export const panelRenderStats = {
  total: summitPanelLayout.controls.length,
  parameterBound: summitPanelLayout.controls.filter(
    (control) => control.parameterId || control.parameterIds?.length,
  ).length,
  stateOnly: summitPanelLayout.controls.filter((control) => control.stateOnly).length,
};
