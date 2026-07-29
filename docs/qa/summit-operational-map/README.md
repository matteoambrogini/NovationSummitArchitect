# Summit operational map — visual QA

Captured on 2026-07-29 with the Playwright Chromium Retina project at
1440 CSS px wide (2880 physical px) unless otherwise noted.

| Evidence              | File                                                           | What it verifies                                                                                          |
| --------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Before                | `before-section-strip.png`                                     | Previous horizontal section-strip model and permanent value labels                                        |
| Final · FIT           | `final-fit-panel.png`                                          | Complete instrument, reference aspect ratio, keyboard and wheels without initial horizontal scroll        |
| Final · 125%          | `final-zoom-125.png`                                           | Native 125% inspection preset and deliberate horizontal viewport                                          |
| Final · 150%          | `final-zoom-150.png`                                           | Native 150% inspection preset and legible hardware labels                                                 |
| Tauri · FIT           | `native-fit-panel.jpeg`                                        | Packaged macOS app after physical OLED/Menu/FX MOD synchronization                                        |
| Tauri · 125%          | `native-zoom-125.jpeg`                                         | Packaged macOS app reporting a 125% zoom state                                                            |
| Tauri · 150%          | `native-zoom-150.jpeg`                                         | Packaged macOS app reporting a 150% zoom state                                                            |
| Final · OLED sequence | `oled-osc-1.png`, `oled-osc-2.png`, `oled-osc-3.png`           | Physical OSC selection and PAGE 1 → 2 → 3 with shared field/value state                                   |
| Final · VOICE 150%    | `voice-area-150.png`                                           | Corrected VOICE and ARP control centres, relative knob/button sizes and broken cyan title rules           |
| Final · OSC/FILTER    | `osc-filter-area-150.png`                                      | Range clearance, photo-order Mixer, Mixer/Filter gap and filter columns at 150%                           |
| Final · ENV/LFO       | `envelopes-lfo-area-150.png`                                   | AMP/MOD band clearance and the operable Global LFO 3/4 selector at 150%                                   |
| Final · Effects       | `effects-area-150.png`                                         | Bypass under Effects and Reverb/Time/Size under Reverb                                                    |
| Final · OLED row      | `oled-row-highlight.png`                                       | Horizontal clipped highlight with constant x, width, height and step                                      |
| Cleanup · display     | `display-menu-area-zoom.png`                                   | OLED and compact 1/2/3 label gaps, with unchanged button centres, aligned to the HR photo                 |
| Header · display      | `display-menu-area-zoom.png`                                   | Full MENU segment, label below it, then OLED, row buttons, PAGE controls and VALUE                        |
| Header · oscillators  | `oscillator-area-zoom.png`                                     | OSCILLATOR 1/2/3 use the common segment → label → controls rhythm on y 96/161/226                         |
| Header · voice/arp    | `voice-arp-area-zoom.png`                                      | VOICE and ARP labels sit fully below their complete cyan segments                                         |
| Header · filter/env   | `filter-envelopes-area-zoom.png`                               | FILTER, AMP ENVELOPE and MOD ENVELOPES retain clear label/content bands                                   |
| Header · LFO/FX       | `lfo-effects-area-zoom.png`                                    | LFO 1/2/GLOBAL and Distortion/Chorus/Delay/Effects/Reverb have independently bounded header geometry      |
| Calibration · VOICE   | `reference-overlay-voice.png`, `voice-reference-vs-vector.png` | Photo/vector comparison at 50% opacity with measured control-centre markers                               |
| Calibration · display | `reference-overlay-display-menu.png`                           | HR photo/vector comparison for OLED, 1/2/3 and VALUE                                                      |
| Calibration · full    | `reference-overlay-full-panel.png`                             | Shared 1536 × 539 photo/vector viewBox, crosshair and all control centres                                 |
| After · OLED browser  | `after-display-browser.png`                                    | Area/page browser, LFO page 10/10 and exact generated `PAGE ▶ × 9` path                                   |
| After · checklist     | `after-patch-checklist.png`                                    | Complete Single checklist with physical/menu/matrix filters                                               |
| After · setup         | `after-setup-mode.png`                                         | Setup Mode filter, menu-button highlight, OLED/inspector synchronization and optional information overlay |

## Landmark comparison report

The final FIT frame was compared against
`docs/references/summit-ui/summit-ui-reference-pack/summit-front-panel-highres.jpeg`.
Coordinates use the shared 1536 × 539 reference space.

| Landmark                   | Reference                   | Final render assessment                                                               |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| Complete chassis           | x 14, y 41, w 1484, h 446   | Aligned; continuous deck and wood cheeks retained                                     |
| OLED                       | x 183, y 133, w 110, h 47   | Aligned; interactive four-row display replaces the former browser-only representation |
| Pitch wheel                | x 63, y 329, w 30, h 84     | Aligned in the left performance bay                                                   |
| Mod wheel                  | x 114, y 329, w 30, h 84    | Aligned beside pitch                                                                  |
| Keyboard                   | x 185, y 285, w 1275, h 202 | Aligned; 61-key span and deck boundary retained                                       |
| Voice                      | x 321, y 64, w 139, h 58    | Section retained; Mode +25/+20, Glide On +24/+20 and Glide Time +19/+0 px             |
| Arpeggiator                | x 321, y 128, w 139, h 140  | Aligned as a vertical block                                                           |
| Oscillator 1               | x 465, y 64, w 292, h 61    | Full segment y 65, label below at y 72, controls centred at y 96                      |
| Oscillator 2               | x 465, y 129, w 292, h 61   | Full segment y 130, label below at y 137, controls centred at y 161                   |
| Oscillator 3               | x 465, y 194, w 292, h 63   | Full segment y 195, label below at y 202, controls centred at y 226                   |
| Filter                     | x 900, y 64, w 120, h 193   | Columns corrected to x 923/963/1003; no control extends into Amp Envelope             |
| Amp Envelope               | x 1023, y 64, w 146, h 91   | Slider centres corrected to x 1068/1095/1122/1150                                     |
| Mod Envelopes              | x 1023, y 159, w 146, h 98  | Header y 163; same columns at y 220 with 66 px travel                                 |
| Effects                    | x 1297, y 64, w 168, h 193  | Distinct zones; Bypass and Reverb trio follow the photographed bottom-row grouping    |
| SUMMIT wordmark            | upper-right deck            | Corrected to the observed upper-right position                                        |
| Oxford / bi-timbral labels | keyboard boundary           | Both labels restored at the observed left/right positions                             |

## Residual visual differences

- The renderer intentionally uses clean vector controls rather than reproducing photographic glare,
  cable shadows, wood grain and lens perspective.
- The hierarchy pass moves the repeated control rows by up to 5 px and the MOD envelope slider
  centres by 7 px; this is the documented cost of a constant, intersection-free label band.
- Small knob legends are normalized for screen legibility; cyan rules are broken before each
  section in the photograph, while the vector hierarchy deliberately shows the complete segment
  above the label.
- The HR photograph has soft edges and mild perspective; the display cluster and repeated control
  rows are therefore reported to a 2 px visual tolerance rather than a sub-pixel claim.
- The keyboard is a geometric 61-key representation and does not reproduce individual key wear or
  camera distortion.

## Pointer and OLED QA

- Left-drag on a knob/encoder changes only its value and empties browser text selection.
- Wheel/trackpad deltas are handled by non-passive native listeners; panel scroll and page scroll
  remain unchanged.
- Plain left-drag on the background remains `INTERACT`; `Space` + left-drag and middle-drag enter
  `PAN`.
- An explicit `activeControlInteraction` locks viewport pan until pointer up, cancel, lost focus or
  visibility change.
- OLED rows share their source order with the Display & menu view, are limited to 1–4 rows, and use
  constant horizontal highlight geometry clipped to the OLED bounds.
- The Global LFO `3 / 4` selector accepts pointer and keyboard activation; changing it updates the
  visible indicator and routes Type, Rate and Sync to the selected LFO’s verified patch parameters.

The reference photo, complete menu video and original screenshots are preserved
in `docs/references/summit-ui/summit-ui-reference-pack/`.
