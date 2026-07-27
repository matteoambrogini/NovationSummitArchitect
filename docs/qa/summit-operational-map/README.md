# Summit operational map — visual QA

Captured on 2026-07-27 with the Playwright Chromium Retina project at
1440 CSS px wide (2880 physical px) unless otherwise noted.

| Evidence              | File                                                 | What it verifies                                                                                          |
| --------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Before                | `before-section-strip.png`                           | Previous horizontal section-strip model and permanent value labels                                        |
| Final · FIT           | `final-fit-panel.png`                                | Complete instrument, reference aspect ratio, keyboard and wheels without initial horizontal scroll        |
| Final · 125%          | `final-zoom-125.png`                                 | Native 125% inspection preset and deliberate horizontal viewport                                          |
| Final · 150%          | `final-zoom-150.png`                                 | Native 150% inspection preset and legible hardware labels                                                 |
| Tauri · FIT           | `native-fit-panel.jpeg`                              | Packaged macOS app after physical OLED/Menu/FX MOD synchronization                                        |
| Tauri · 125%          | `native-zoom-125.jpeg`                               | Packaged macOS app reporting a 125% zoom state                                                            |
| Tauri · 150%          | `native-zoom-150.jpeg`                               | Packaged macOS app reporting a 150% zoom state                                                            |
| Final · OLED sequence | `oled-osc-1.png`, `oled-osc-2.png`, `oled-osc-3.png` | Physical OSC selection and PAGE 1 → 2 → 3 with shared field/value state                                   |
| After · OLED browser  | `after-display-browser.png`                          | Area/page browser, LFO page 10/10 and exact generated `PAGE ▶ × 9` path                                   |
| After · checklist     | `after-patch-checklist.png`                          | Complete Single checklist with physical/menu/matrix filters                                               |
| After · setup         | `after-setup-mode.png`                               | Setup Mode filter, menu-button highlight, OLED/inspector synchronization and optional information overlay |

## Landmark comparison report

The final FIT frame was compared against
`docs/references/summit-ui/summit-ui-reference-pack/summit-front-panel-highres.jpeg`.
Coordinates use the shared 1536 × 539 reference space.

| Landmark                   | Reference                   | Final render assessment                                                               |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| Complete chassis           | x 14, y 41, w 1484, h 446   | Aligned; continuous deck and wood cheeks retained                                     |
| OLED                       | x 164, y 135, w 110, h 44   | Aligned; interactive four-row display replaces the former browser-only representation |
| Pitch wheel                | x 63, y 329, w 30, h 84     | Aligned in the left performance bay                                                   |
| Mod wheel                  | x 114, y 329, w 30, h 84    | Aligned beside pitch                                                                  |
| Keyboard                   | x 185, y 285, w 1275, h 202 | Aligned; 61-key span and deck boundary retained                                       |
| Voice                      | x 321, y 64, w 139, h 58    | Aligned above the arpeggiator                                                         |
| Arpeggiator                | x 321, y 128, w 139, h 140  | Aligned as a vertical block                                                           |
| Oscillator 1               | x 465, y 64, w 292, h 61    | Aligned as the first horizontal oscillator row                                        |
| Oscillator 2               | x 465, y 129, w 292, h 61   | Aligned as the second horizontal oscillator row                                       |
| Oscillator 3               | x 465, y 194, w 292, h 63   | Aligned as the third horizontal oscillator row                                        |
| Filter                     | x 900, y 64, w 120, h 193   | Aligned between mixer and envelopes                                                   |
| Amp Envelope               | x 1023, y 64, w 146, h 91   | Aligned above Mod Envelopes                                                           |
| Mod Envelopes              | x 1023, y 159, w 146, h 98  | Aligned below Amp Envelope                                                            |
| Effects                    | x 1297, y 64, w 168, h 193  | Aligned; Distortion, Chorus, Delay, Effects and Reverb remain distinct                |
| SUMMIT wordmark            | upper-right deck            | Corrected to the observed upper-right position                                        |
| Oxford / bi-timbral labels | keyboard boundary           | Both labels restored at the observed left/right positions                             |

## Residual visual differences

- The renderer intentionally uses clean vector controls rather than reproducing photographic glare,
  cable shadows, wood grain and lens perspective.
- Small knob legends are normalized for screen legibility; their wording still comes from the
  verified catalog/layout data.
- The keyboard is a geometric 61-key representation and does not reproduce individual key wear or
  camera distortion.

The reference photo, complete menu video and original screenshots are preserved
in `docs/references/summit-ui/summit-ui-reference-pack/`.
