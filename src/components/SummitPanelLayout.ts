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

export type LayoutLandmark = LayoutSection;

export type LayoutSerigraphy = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
};

export const SERIGRAPHY_LABEL_BASELINE_OFFSET = -2.5;

export function serigraphyLineStartX(mark: LayoutSerigraphy): number {
  const measuredLabelClearance = mark.label.length * 4.5 + 8;
  return mark.x + Math.min(mark.width - 3, Math.max(18, measuredLabelClearance));
}

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
    measurementMethod: string;
    referenceWidth: number;
    referenceHeight: number;
  };
  landmarks: LayoutLandmark[];
  serigraphy: LayoutSerigraphy[];
  sections: LayoutSection[];
  controls: LayoutControl[];
};

export const panelLandmarkById = new Map(
  summitPanelLayout.landmarks.map((landmark) => [landmark.id, landmark]),
);

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
