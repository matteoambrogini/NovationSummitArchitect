# Summit panel geometry trace

## Source

- Document: Novation Summit high-resolution front panel reference
- Section: complete front elevation
- Page: 1
- Local source: `docs/references/summit-ui/summit-ui-reference-pack/summit-front-panel-highres.jpeg`
- Reference raster: 1536 × 539 px
- Verified: 2026-07-27

## Reproducible coordinate procedure

1. Use the uncropped 1536 × 539 reference as the SVG `viewBox`.
2. Trace the complete chassis, control deck, performance bay and keyboard as pixel bounding boxes.
3. Record the centre of every knob, selector, button and slider directly in reference pixels.
4. Record rectangular components, including OLED, keyboard and wheels, as `x`, `y`, `width`, `height`.
5. Store all measurements in `src/data/summit-control-layout.json`; do not interpolate missing positions with a grid.
6. Render the SVG with the same aspect ratio. `FIT PANEL` may scale uniformly, but must not alter coordinates.
7. Validate coordinates, source metadata and required landmarks with `pnpm validate:catalogs`.

## Principal measured landmarks

| Landmark         | Reference bounding box      |
| ---------------- | --------------------------- |
| Complete chassis | x 14, y 41, w 1484, h 446   |
| OLED display     | x 164, y 135, w 110, h 44   |
| Pitch wheel      | x 63, y 329, w 30, h 84     |
| Mod wheel        | x 114, y 329, w 30, h 84    |
| Keyboard         | x 185, y 285, w 1275, h 202 |
| Voice            | x 321, y 64, w 139, h 58    |
| Arpeggiator      | x 321, y 128, w 139, h 140  |
| Oscillator 1     | x 465, y 64, w 292, h 61    |
| Oscillator 2     | x 465, y 129, w 292, h 61   |
| Oscillator 3     | x 465, y 194, w 292, h 63   |
| Filter           | x 900, y 64, w 120, h 193   |
| Amp Envelope     | x 1023, y 64, w 146, h 91   |
| Mod Envelopes    | x 1023, y 159, w 146, h 98  |
| Effects          | x 1297, y 64, w 168, h 193  |

## Rendering contract

- Section records remain available for focus and accessibility, but are not rendered as cards.
- The visible grouping comes from measured cyan rules and silkscreen labels.
- OSCILLATOR 1, 2 and 3 are distinct rows.
- Distortion, Chorus, Delay, Effects and Reverb retain their separate observed zones.
- Software values are hidden in clean hardware mode and shown only for hover, selection, Setup Mode or explicit overlay.
