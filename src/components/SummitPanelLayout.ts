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

export type LayoutBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutSectionHeader = {
  id: string;
  label: string;
  headerLineStartX: number;
  headerLineEndX: number;
  headerY: number;
  labelX: number;
  labelY: number;
  contentTopY: number;
  contentBounds: LayoutBounds;
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
    measurementMethod: string;
    referenceWidth: number;
    referenceHeight: number;
  };
  landmarks: LayoutLandmark[];
  sectionHeaders: LayoutSectionHeader[];
  sections: LayoutSection[];
  controls: LayoutControl[];
};

export function sectionHeadersForControl(control: LayoutControl): LayoutSectionHeader[] {
  return summitPanelLayout.sectionHeaders.filter(({ contentBounds }) => {
    const right = contentBounds.x + contentBounds.width;
    const bottom = contentBounds.y + contentBounds.height;
    return (
      control.x >= contentBounds.x &&
      control.x <= right &&
      control.y >= contentBounds.y &&
      control.y <= bottom
    );
  });
}

export function sectionHeaderForControl(control: LayoutControl): LayoutSectionHeader | undefined {
  const matches = sectionHeadersForControl(control);
  return matches.length === 1 ? matches[0] : undefined;
}

export function layoutControlHorizontalBounds(control: LayoutControl): {
  left: number;
  right: number;
} {
  const size = control.size ?? 18;
  const labelHalfWidth = control.label.length * 1.35;
  const visualHalfWidth =
    control.type === "button"
      ? Math.max(labelHalfWidth, Math.max(14, size * 1.55) / 2 + 4)
      : control.type === "toggle"
        ? Math.max(labelHalfWidth, 15)
        : control.type === "slider"
          ? Math.max(labelHalfWidth, 11)
          : Math.max(labelHalfWidth, 12, size / 2 + 7);
  return {
    left: control.x - visualHalfWidth,
    right: control.x + visualHalfWidth,
  };
}

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
