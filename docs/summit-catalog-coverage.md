# Copertura del catalogo Summit

> File generato da `pnpm catalog:coverage`. Non modificare manualmente.

Target primario: **Novation Summit firmware 2.1**. Ultima verifica delle fonti: 2026-07-26.

## Definizioni

- **Verified/Unverified/Conflict/Unknown** descrivono l'affidabilità del dato e non la sua compatibilità firmware.
- **Firmware 2.1 verified** conta il sottoinsieme verificato introdotto esattamente in 2.1; non è uno stato alternativo.
- **AI usable @2.1** richiede stato `verified`, `aiExposed: true` e applicabilità al target. Per il MIDI richiede inoltre una traduzione verificata.
- **Copertura AI** è la metrica principale per la readiness del sound design. Il MIDI è riportato separatamente ed è escluso dalle soglie.

## Definition of done

| Area          | Soglia | AI usable @2.1 | Copertura AI | Esito                 |
| ------------- | -----: | -------------: | -----------: | --------------------- |
| Oscillatori   |   ≥95% |          53/54 |        98.1% | raggiunta             |
| FM            |   ≥90% |            3/9 |        33.3% | eccezione documentata |
| Mixer         |   ≥95% |            7/7 |       100.0% | raggiunta             |
| Filter        |   ≥90% |          15/15 |       100.0% | raggiunta             |
| Envelopes     |   ≥95% |          34/34 |       100.0% | raggiunta             |
| LFO           |   ≥90% |          38/38 |       100.0% | raggiunta             |
| Voice         |   ≥85% |          10/10 |       100.0% | raggiunta             |
| Reverb        |   ≥85% |          10/10 |       100.0% | raggiunta             |
| Delay         |   ≥85% |          13/13 |       100.0% | raggiunta             |
| Chorus        |   ≥85% |            8/8 |       100.0% | raggiunta             |
| Multi         |   ≥85% |           8/10 |        80.0% | eccezione documentata |
| Mod Matrix    |   ≥90% |          73/73 |       100.0% | raggiunta             |
| FX Mod Matrix |   ≥85% |          41/41 |       100.0% | raggiunta             |

Le eccezioni sotto soglia sono circoscritte e non vengono colmate con inferenze:

- **FM (33.3%)**: le tre profondità Manual sono verificabili e utilizzabili. Per le sei profondità LFO 2/Mod Env 2 le fonti ufficiali confermano rotta e semantica additiva, ma non pubblicano dominio, default o traduzione MIDI; restano `unverified`.
- **Multi (80.0%)**: otto controlli hanno dominio sicuro. `multi.partA.level` e `multi.partB.level` sono visibili nella guida, ma il dominio e il default non sono documentati; restano `unknown`.

## Stato per catalogo

| Catalogo            | Totale | Verified | Unverified | Conflict | Firmware 2.1 verified | Unknown/undocumented | AI usable @2.1 | Copertura AI |
| ------------------- | -----: | -------: | ---------: | -------: | --------------------: | -------------------: | -------------: | -----------: |
| Parametri           |    232 |      222 |          7 |        1 |                    17 |                    2 |            213 |        91.8% |
| Controlli fisici    |     89 |       87 |          0 |        2 |                     0 |                    0 |             87 |        97.8% |
| Menu                |     10 |        7 |          0 |        3 |                     0 |                    0 |              7 |        70.0% |
| Sorgenti Mod        |     24 |       24 |          0 |        0 |                     1 |                    0 |             24 |       100.0% |
| Destinazioni Mod    |     49 |       49 |          0 |        0 |                    11 |                    0 |             49 |       100.0% |
| Sorgenti FX Mod     |     17 |       17 |          0 |        0 |                     1 |                    0 |             17 |       100.0% |
| Destinazioni FX Mod |     24 |       24 |          0 |        0 |                    12 |                    0 |             24 |       100.0% |
| Mapping MIDI        |    177 |      177 |          0 |        0 |                    19 |                    0 |            107 |        60.5% |
| Override firmware   |     11 |        9 |          0 |        2 |                     9 |                    0 |              0 |         0.0% |

Il catalogo parametrico conserva inoltre **1 conflitto a livello di attributo**: il default di Reverb Size (64 nella guida 1.1/tabella MIDI, 90 nella guida online). Il parametro resta verificato e AI-usable perché dominio e comportamento non sono in conflitto.

## Copertura per sezione parametrica

| Sezione           | Totale | Verified | Unverified | Conflict | Firmware 2.1 verified | Unknown/undocumented | AI usable @2.1 | Copertura AI |
| ----------------- | -----: | -------: | ---------: | -------: | --------------------: | -------------------: | -------------: | -----------: |
| Amp Envelope      |      5 |        5 |          0 |        0 |                     0 |                    0 |              5 |       100.0% |
| Animate Envelopes |      4 |        4 |          0 |        0 |                     4 |                    0 |              4 |       100.0% |
| Arp/Clock         |      7 |        7 |          0 |        0 |                     1 |                    0 |              5 |        71.4% |
| Arpeggiator       |      6 |        5 |          0 |        1 |                     0 |                    0 |              5 |        83.3% |
| Chorus            |      8 |        8 |          0 |        0 |                     1 |                    0 |              8 |       100.0% |
| Delay             |     13 |       13 |          0 |        0 |                     3 |                    0 |             13 |       100.0% |
| Distortion        |      1 |        1 |          0 |        0 |                     0 |                    0 |              1 |       100.0% |
| Effects           |      1 |        1 |          0 |        0 |                     0 |                    0 |              1 |       100.0% |
| Envelope Menu     |     15 |       15 |          0 |        0 |                     0 |                    0 |             15 |       100.0% |
| Filter            |     15 |       15 |          0 |        0 |                     0 |                    0 |             15 |       100.0% |
| FM                |      9 |        3 |          6 |        0 |                     0 |                    0 |              3 |        33.3% |
| FX Menu           |      3 |        3 |          0 |        0 |                     0 |                    0 |              2 |        66.7% |
| Glide             |      2 |        2 |          0 |        0 |                     0 |                    0 |              2 |       100.0% |
| Global LFO 3      |      4 |        4 |          0 |        0 |                     0 |                    0 |              4 |       100.0% |
| Global LFO 4      |      4 |        4 |          0 |        0 |                     0 |                    0 |              4 |       100.0% |
| Keyboard          |      1 |        1 |          0 |        0 |                     0 |                    0 |              0 |         0.0% |
| LFO 1             |      5 |        5 |          0 |        0 |                     0 |                    0 |              5 |       100.0% |
| LFO 2             |      5 |        5 |          0 |        0 |                     0 |                    0 |              5 |       100.0% |
| LFO Menu          |     20 |       20 |          0 |        0 |                     6 |                    0 |             20 |       100.0% |
| Mixer             |      6 |        6 |          0 |        0 |                     0 |                    0 |              6 |       100.0% |
| Mod Envelope 1    |      5 |        5 |          0 |        0 |                     0 |                    0 |              5 |       100.0% |
| Mod Envelope 2    |      5 |        5 |          0 |        0 |                     0 |                    0 |              5 |       100.0% |
| Multi             |     10 |        8 |          0 |        0 |                     0 |                    2 |              8 |        80.0% |
| Oscillator Menu   |     24 |       23 |          1 |        0 |                     0 |                    0 |             23 |        95.8% |
| Oscillators       |     30 |       30 |          0 |        0 |                     0 |                    0 |             30 |       100.0% |
| Reverb            |     10 |       10 |          0 |        0 |                     0 |                    0 |             10 |       100.0% |
| Settings          |      5 |        5 |          0 |        0 |                     0 |                    0 |              0 |         0.0% |
| Voice             |      1 |        1 |          0 |        0 |                     0 |                    0 |              1 |       100.0% |
| Voice Menu        |      8 |        8 |          0 |        0 |                     2 |                    0 |              8 |       100.0% |

## Copertura per menu patch-relevant

| Menu      | Entità catalogate | AI usable @2.1 | Copertura AI | Fixture valida | Stato del menu |
| --------- | ----------------: | -------------: | -----------: | -------------- | -------------- |
| Osc       |                24 |             23 |        95.8% | sì             | verified       |
| Voice     |                12 |             12 |       100.0% | sì             | conflict       |
| Env       |                19 |             19 |       100.0% | sì             | verified       |
| LFO       |                26 |             26 |       100.0% | sì             | verified       |
| Arp/Clock |                10 |              7 |        70.0% | sì             | conflict       |
| Settings  |                 5 |              0 |         0.0% | n/a            | verified       |
| FX        |                25 |             24 |        96.0% | sì             | conflict       |
| Mod       |                73 |             73 |       100.0% | sì             | verified       |
| FX Mod    |                41 |             41 |       100.0% | sì             | verified       |
| Multi     |                 9 |              7 |        77.8% | sì             | verified       |

Lo stato del menu descrive la certezza della navigazione, non invalida i parametri verificati al suo interno. Voice resta `conflict` perché la guida online dichiara quattro pagine ma ne documenta cinque; FX resta `conflict` perché il testo conserva il vecchio conteggio mentre le schermate firmware mostrano dieci pagine.

## MIDI

| Livello                     | Verified | Unverified | Conflict | Unknown | AI usable @2.1 |
| --------------------------- | -------: | ---------: | -------: | ------: | -------------: |
| Esistenza/indirizzo mapping |      177 |          0 |        0 |       0 |            107 |
| Traduzione raw ↔ Summit     |      107 |         56 |       14 |       0 |            107 |

I **56** parametri classificati `officially-absent` non compaiono nella lista MIDI ufficiale pubblicata. Questa classificazione non equivale a “non controllabile”: impedisce soltanto di inventare un mapping. L'esistenza del mapping Arp Chance è verificata, ma la traduzione resta `conflict` perché la tabella MIDI pubblica 1–100 mentre il parametro firmware pubblica 10–100.

## Residui non AI-usable

Oltre alle eccezioni FM e Multi:

- `osc.common.tuningTable` resta `unverified` per il sound design: il selettore 0–16 è documentato, ma il contenuto delle tabelle 1–16 è configurabile dall'utente.
- `arp.octaves` resta `conflict` perché le fonti ufficiali consultate non concordano sul limite massimo.
- Le tre voci `osc*.waveMore` sono verificate e AI-usable soltanto per le prime 50 wavetable di fabbrica; gli ultimi 10 slot configurabili dall'utente sono rifiutati dal validatore.
