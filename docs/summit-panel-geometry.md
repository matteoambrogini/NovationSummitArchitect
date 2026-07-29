# Summit panel geometry trace

## Source

- Document: Novation Summit high-resolution front panel reference
- Section: complete front elevation
- Page: 1
- Local source: `docs/references/summit-ui/summit-ui-reference-pack/summit-front-panel-highres.jpeg`
- Reference raster: 1536 × 539 px
- Layout schema: 2.4.0
- Verified: 2026-07-29

## Reproducible coordinate procedure

1. Use the uncropped 1536 × 539 reference as the SVG `viewBox`.
2. Trace the complete chassis, control deck, performance bay and keyboard as pixel bounding boxes.
3. Record the centre of every knob, selector, button and slider directly in reference pixels.
4. Record rectangular components, including OLED, keyboard and wheels, as `x`, `y`, `width`, `height`.
5. Store all measurements in `src/data/summit-control-layout.json`; do not interpolate missing positions with a grid.
6. Render the SVG with the same aspect ratio. `FIT PANEL` may scale uniformly, but must not alter coordinates.
7. Validate coordinates, source metadata and required landmarks with `pnpm validate:catalogs`.
8. In development, enable **Reference calibration**, keep photo and vector visible at 50% opacity,
   and check the same 1536 × 539 coordinate space with grid, crosshair and control-centre markers.
9. Model each visible group as a `sectionHeader` with `headerLineStartX`, `headerLineEndX`,
   `headerY`, `labelY`, `contentTopY` and `contentBounds`.
10. Verify the rendered SVG bounding boxes: the complete cyan segment comes first, the section
    label is fully below it, and every visual control bound remains horizontally inside the segment.
11. Keep at least 1 px between the rendered section-label bottom and `contentTopY`; fail validation
    if a control maps to zero or more than one content rectangle.

## Principal measured landmarks

| Landmark         | Reference bounding box      |
| ---------------- | --------------------------- |
| Complete chassis | x 14, y 41, w 1484, h 446   |
| Left wood cheek  | x 14, y 41, w 21, h 446     |
| Right wood cheek | x 1474, y 41, w 24, h 446   |
| OLED display     | x 183, y 133, w 110, h 47   |
| Pitch wheel      | x 63, y 329, w 30, h 84     |
| Mod wheel        | x 114, y 329, w 30, h 84    |
| Keyboard         | x 185, y 285, w 1275, h 202 |
| Voice            | x 321, y 64, w 139, h 58    |
| Arpeggiator      | x 321, y 128, w 139, h 140  |
| Oscillator 1     | x 465, y 64, w 292, h 61    |
| Oscillator 2     | x 465, y 129, w 292, h 61   |
| Oscillator 3     | x 465, y 194, w 292, h 63   |
| FM               | x 760, y 64, w 60, h 193    |
| Mixer            | x 823, y 64, w 74, h 193    |
| Filter           | x 900, y 64, w 120, h 193   |
| Amp Envelope     | x 1023, y 64, w 146, h 91   |
| Mod Envelopes    | x 1023, y 159, w 146, h 98  |
| LFO 1            | x 1172, y 64, w 123, h 61   |
| LFO 2            | x 1172, y 129, w 123, h 61  |
| Global LFO 3 & 4 | x 1172, y 194, w 123, h 63  |
| Effects          | x 1297, y 64, w 168, h 193  |

## Calibration corrections

The reference overlay exposed three concentrated errors; the remaining named landmarks above stayed
within the retained one-pixel tracing tolerance.

| Area                  | Previous vector                    | Corrected reference coordinate        | Residual |
| --------------------- | ---------------------------------- | ------------------------------------- | -------- |
| DISPLAY · OLED        | x 164, y 135, w 110, h 44          | x 183, y 133, w 110, h 47             | ≤ 2 px   |
| DISPLAY · row buttons | column x 153, rows 139/156/173     | x 164, rows 143/160/177               | ≤ 2 px   |
| DISPLAY · VALUE       | centre x 295, y 155                | x 312, y 155                          | ≤ 2 px   |
| VOICE · Mode          | centre x 340, y 91                 | x 365, y 111                          | ≤ 2 px   |
| VOICE · Glide On      | centre x 381, y 91                 | x 405, y 111                          | ≤ 2 px   |
| VOICE · Glide Time    | centre x 422, y 91                 | x 441, y 91                           | ≤ 2 px   |
| ARP controls          | synthetic 3 × 3 grid               | observed centres x 360–441, y 154–244 | ≤ 3 px   |
| OSC / FM / MIXER rows | y 78/145/212                       | hierarchy rows y 96/161/226           | ≤ 7 px   |
| FILTER controls       | synthetic rows extending to x 1040 | observed columns x 923, 963, 1003     | ≤ 3 px   |
| AMP / MOD envelopes   | slider columns x 1075–1159         | x 1068, 1095, 1122, 1150              | ≤ 2 px   |
| AMP header clearance  | slider centre y 115                | y 120, preserving 70 px travel        | ≤ 5 px   |
| MOD header clearance  | centre y 211, slider travel 78 px  | centre y 218, travel 72 px            | ≤ 7 px   |

The final optical pass keeps the same dated source and narrows the corrections to the requested
control groups:

| Area                | Final coordinate or spacing contract                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| MULTI / ANIMATES    | MULTI controls y 249; ANIMATES rule/label/content y 255/262/265 and buttons y 280.5, size 13         |
| DISPLAY row numbers | Button centres remain x 164 at y 143/160/177; label gap 6 → 2.5 px moves 1/2/3 down without overlap  |
| OSC 1/2/3 Range     | x 479, size 14; the conservative left visual bound is exactly x 465, inside each cyan segment        |
| MIXER               | columns x 842/881; rows read Osc 1–VCA Gain, Osc 2–Ring 1*2, Osc 3–Noise at y 96/161/226             |
| MIXER / FILTER      | MIXER segment ends at x 897 and FILTER starts at x 900, leaving a distinct 3 px cyan-segment gap     |
| AMP / MOD envelopes | AMP values use bottom + 5 px (baseline y 160); MOD rule remains y 163 and clears every visible value |
| EFFECTS / REVERB    | Bypass x 1322; Reverb/Time/Size x 1363/1401/1440, each inside its matching bottom-row segment        |

The cyan hierarchy is data-driven rather than inferred from independent serigraphy marks. Every
header renders its complete cyan segment first, then a label baseline 7 px lower, then a content
band beginning another 3 px lower. `contentBounds` shares the segment's horizontal limits. Catalog
validation assigns every deck control to exactly one rectangle and checks a conservative visual
bounding box; Playwright then checks the real SVG boxes for line/text intersections, label/control
intersections and horizontal overflow.

## Rendering contract

- Section records remain available for focus and accessibility, but are not rendered as cards.
- The visible grouping comes from explicit cyan segment → section label → content records.
- OSCILLATOR 1, 2 and 3 are distinct rows.
- Distortion, Chorus, Delay, Effects and Reverb retain their separate observed zones.
- The Global LFO `3 / 4` selector is keyboard- and pointer-operable; its UI state routes Type, Rate
  and Sync to the verified `lfo3.*` or `lfo4.*` patch binding.
- The Mod Envelope `1 / 2` selector uses the same pointer/keyboard contract and routes Loop plus
  ADSR to the verified `modEnv1.*` or `modEnv2.*` patch binding.
- The OLED, row-button column, page controls and VALUE encoder retain their measured relative spacing.
- Software values are hidden in clean hardware mode and shown only for hover, selection, Setup Mode or explicit overlay.

## Header-geometry residuals

- The structural 7 px line-to-baseline rhythm is deliberately uniform; the photograph uses small,
  inconsistent optical offsets and places some labels inline with the segment.
- Oscillator, FM, Mixer, LFO and Effects rows retain the established y 96/161/226 rhythm. The Range
  selectors use x 479 and size 14, so their full conservative bound remains inside x 465.
- MULTI MODE uses 12 px controls at y 249; ANIMATES begins at y 255 and uses 13 px buttons at
  y 280.5. The OLED and menu-button centres remain unchanged; the 1/2/3 baselines move down 3.5 px
  while preserving a measured positive gap from both adjacent buttons.
