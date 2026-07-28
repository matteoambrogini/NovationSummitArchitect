# Summit panel geometry trace

## Source

- Document: Novation Summit high-resolution front panel reference
- Section: complete front elevation
- Page: 1
- Local source: `docs/references/summit-ui/summit-ui-reference-pack/summit-front-panel-highres.jpeg`
- Reference raster: 1536 × 539 px
- Verified: 2026-07-28

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
9. For title rules, verify the rendered SVG text bounding box: the title baseline stays above the
   cyan rule and the rule starts at least 2 px after the final glyph.

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

| Area                     | Previous vector                    | Corrected reference coordinate         | Residual |
| ------------------------ | ---------------------------------- | -------------------------------------- | -------- |
| DISPLAY · OLED           | x 164, y 135, w 110, h 44          | x 183, y 133, w 110, h 47              | ≤ 2 px   |
| DISPLAY · row buttons    | column x 153, rows 139/156/173     | x 164, rows 143/160/177                | ≤ 2 px   |
| DISPLAY · VALUE          | centre x 295, y 155                | x 312, y 155                           | ≤ 2 px   |
| VOICE · Mode             | centre x 340, y 91                 | x 365, y 111                           | ≤ 2 px   |
| VOICE · Glide On         | centre x 381, y 91                 | x 405, y 111                           | ≤ 2 px   |
| VOICE · Glide Time       | centre x 422, y 91                 | x 441, y 91                            | ≤ 2 px   |
| ARP controls             | synthetic 3 × 3 grid               | observed centres x 360–441, y 154–244  | ≤ 3 px   |
| OSC / FM / MIXER rows    | y 78/145/212                       | observed rows y 91/157/222             | ≤ 2 px   |
| FILTER controls          | synthetic rows extending to x 1040 | observed columns x 923, 963, 1003      | ≤ 3 px   |
| AMP / MOD envelopes      | slider columns x 1075–1159         | x 1068, 1095, 1122, 1150               | ≤ 2 px   |
| MOD envelope label space | slider travel 88 px                | 78 px, preserving the observed centres | ≤ 3 px   |

The cyan serigraphy is rendered as a line layer followed by a label exclusion/paint layer and then
the local control labels. Every macro-label uses one baseline rule 2.5 px above its section line.
Each cyan rule starts after a conservative measured-width clearance, and the text paint masks only
the immediate glyph edge rather than drawing a box or card. The Playwright geometry check compares
the real SVG bounding boxes and fails if a rule reaches a title or if a title drops onto its rule.

## Rendering contract

- Section records remain available for focus and accessibility, but are not rendered as cards.
- The visible grouping comes from measured cyan rules and silkscreen labels.
- OSCILLATOR 1, 2 and 3 are distinct rows.
- Distortion, Chorus, Delay, Effects and Reverb retain their separate observed zones.
- The OLED, row-button column, page controls and VALUE encoder retain their measured relative spacing.
- Software values are hidden in clean hardware mode and shown only for hover, selection, Setup Mode or explicit overlay.
