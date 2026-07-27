import layoutJson from "../data/summit-control-layout.json";

export type LayoutControl = {
  id: string;
  sectionId: string;
  parameterId?: string;
  parameterIds?: string[];
  displayAreaId?: string;
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
  schemaVersion: string;
  viewBox: string;
  geometry: {
    coordinateSystem: string;
    document: string;
    section: string;
    page: number;
    sourceUrl: string;
    verifiedAt: string;
  };
  sections: LayoutSection[];
  controls: LayoutControl[];
};

export const panelRenderStats = {
  total: summitPanelLayout.controls.length,
  parameterBound: summitPanelLayout.controls.filter(
    (control) => control.parameterId || control.parameterIds?.length,
  ).length,
  stateOnly: summitPanelLayout.controls.filter((control) => control.stateOnly).length,
  parameterBindings: new Set(
    summitPanelLayout.controls.flatMap((control) => [
      ...(control.parameterId ? [control.parameterId] : []),
      ...(control.parameterIds ?? []),
    ]),
  ).size,
  physicalElements: summitPanelLayout.controls.length + 61 + 2,
};
