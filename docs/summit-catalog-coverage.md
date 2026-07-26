# Copertura del catalogo Summit

> File generato da `pnpm catalog:coverage`. Non modificare manualmente.

Ultima verifica delle fonti: 2026-07-26.

## Sintesi

| Area                                              | Totale | Verificati | Copertura |
| ------------------------------------------------- | -----: | ---------: | --------: |
| Parametri                                         |    232 |        182 |     78.4% |
| Parametri con posizione menu                      |    130 |         89 |     68.5% |
| Controlli fisici (esclusa navigazione state-only) |     89 |         84 |     94.4% |
| Sorgenti Mod                                      |     24 |         23 |     95.8% |
| Destinazioni Mod                                  |     49 |         38 |     77.6% |
| Sorgenti FX Mod                                   |     17 |         16 |     94.1% |
| Destinazioni FX Mod                               |     24 |         12 |     50.0% |
| Mapping MIDI                                      |    177 |         94 |     53.1% |

I 56 parametri non presenti nella lista MIDI ufficiale sono registrati separatamente senza dedurne la non-controllabilità assoluta. I mapping MIDI “verificati” richiedono anche una traduzione verificata.

## Stato per catalogo

| Catalogo            | Totale | verified | unverified | conflict | firmware-dependent | deprecated |
| ------------------- | -----: | -------: | ---------: | -------: | -----------------: | ---------: |
| Parametri           |    232 |      182 |         15 |        2 |                 33 |          0 |
| Controlli fisici    |     89 |       84 |          3 |        2 |                  0 |          0 |
| Menu                |     10 |        5 |          0 |        3 |                  2 |          0 |
| Sorgenti Mod        |     24 |       23 |          0 |        0 |                  1 |          0 |
| Destinazioni Mod    |     49 |       38 |          0 |        0 |                 11 |          0 |
| Sorgenti FX Mod     |     17 |       16 |          0 |        0 |                  1 |          0 |
| Destinazioni FX Mod |     24 |       12 |          0 |        0 |                 12 |          0 |
| Mapping MIDI        |    177 |       94 |         50 |       13 |                 20 |          0 |
| Override firmware   |     11 |        0 |          0 |        2 |                  9 |          0 |

## Copertura per sezione parametrica

| Sezione           | Parametri | Verificati | Copertura |
| ----------------- | --------: | ---------: | --------: |
| Amp Envelope      |         5 |          5 |    100.0% |
| Animate Envelopes |         4 |          0 |      0.0% |
| Arp/Clock         |         7 |          6 |     85.7% |
| Arpeggiator       |         6 |          4 |     66.7% |
| Chorus            |         8 |          7 |     87.5% |
| Delay             |        13 |         10 |     76.9% |
| Distortion        |         1 |          1 |    100.0% |
| Effects           |         1 |          1 |    100.0% |
| Envelope Menu     |        15 |         15 |    100.0% |
| Filter            |        15 |         11 |     73.3% |
| FM                |         9 |          0 |      0.0% |
| FX Menu           |         3 |          3 |    100.0% |
| Glide             |         2 |          2 |    100.0% |
| Global LFO 3      |         4 |          4 |    100.0% |
| Global LFO 4      |         4 |          4 |    100.0% |
| Keyboard          |         1 |          1 |    100.0% |
| LFO 1             |         5 |          5 |    100.0% |
| LFO 2             |         5 |          5 |    100.0% |
| LFO Menu          |        20 |         14 |     70.0% |
| Mixer             |         6 |          6 |    100.0% |
| Mod Envelope 1    |         5 |          5 |    100.0% |
| Mod Envelope 2    |         5 |          5 |    100.0% |
| Multi             |        10 |          8 |     80.0% |
| Oscillator Menu   |        24 |         20 |     83.3% |
| Oscillators       |        30 |         30 |    100.0% |
| Reverb            |        10 |          2 |     20.0% |
| Settings          |         5 |          5 |    100.0% |
| Voice             |         1 |          1 |    100.0% |
| Voice Menu        |         8 |          2 |     25.0% |

## Copertura per menu patch-relevant

| Menu      | Entità catalogate | Verificate | Copertura | Fixture valida |
| --------- | ----------------: | ---------: | --------: | -------------- |
| Osc       |                24 |         20 |     83.3% | sì             |
| Voice     |                12 |          2 |     16.7% | sì             |
| Env       |                19 |         15 |     78.9% | sì             |
| LFO       |                26 |         20 |     76.9% | sì             |
| Arp/Clock |                10 |          7 |     70.0% | sì             |
| Settings  |                 5 |          5 |    100.0% | n/a            |
| FX        |                25 |         13 |     52.0% | sì             |
| Mod       |                73 |         61 |     83.6% | sì             |
| FX Mod    |                41 |         28 |     68.3% | sì             |
| Multi     |                 9 |          7 |     77.8% | sì             |

La percentuale misura la quota con stato `verified`, non una stima della completezza del protocollo non pubblicato. Le entità `firmware-dependent` possono essere ufficiali ma restano escluse dalla quota verificata finché la versione firmware non è parte del contesto di validazione.
