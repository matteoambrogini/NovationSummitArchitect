# Metodo per le fonti Summit

## Fonti ammesse

Il catalogo usa esclusivamente documentazione ufficiale Novation:

1. [pagina download ufficiale Summit](https://downloads.novationmusic.com/novation/synthesisers/summit);
2. Summit User Guide v1.1, copia ufficiale archiviata in `docs/references`;
3. Summit & Peak Firmware Update Addendum 2.1, copia ufficiale archiviata in `docs/references`;
4. [Summit in detail](https://userguides.novationmusic.com/hc/en-gb/articles/25003971047186-Summit-in-detail);
5. [Summit appendix](https://userguides.novationmusic.com/hc/en-gb/articles/25003993283986-Summit-appendix).

L'indice machine-readable è `src/data/summit-source-index.json`. Forum, Reddit, editor di
terze parti e reverse engineering non sono fonti accettabili.

## Verifica a due passaggi

Ogni entità viene trattata in due passaggi separati:

1. **estrazione** dalla guida utente o dall'addendum firmware, registrando documento,
   sezione, pagina o locator, URL e data;
2. **verifica indipendente** contro una seconda rappresentazione ufficiale, normalmente
   la guida online o l'appendice MIDI.

La seconda fonte deve confermare la stessa semantica. Una mera ripetizione dello stesso
PDF o un'inferenza da numerazioni contigue non conta come verifica indipendente.

I valori leggibili sul pannello, i domini interni e i valori MIDI rimangono distinti.
Una coppia CC, un range numerico o una sequenza NRPN non bastano a inventare la formula
di conversione. Per questo motivo il catalogo conserva anche mapping ufficiali non
utilizzabili dall'automazione.

## Stati

- `verified`: due fonti ufficiali coerenti;
- `unverified`: una fonte ufficiale non basta a confermare range, menu o traduzione;
- `conflict`: fonti ufficiali o sezioni dello stesso documento sono incompatibili;
- `firmware-dependent`: il dato dipende esplicitamente dalla versione firmware;
- `deprecated`: il dato è ufficialmente superato, ma resta necessario per la
  compatibilità storica.

Solo parametri con `verificationStatus: "verified"` e `aiExposed: true` entrano nel
catalogo AI. Un mapping MIDI è utilizzabile solo se mapping e traduzione sono entrambi
`verified` e `aiUsable` è `true`. Le aggiunte firmware non vengono promosse
automaticamente a `verified`.

## Ambiti e firmware

`part`, `multi` e `global` sono ambiti distinti. I parametri globali e Multi non possono
essere inseriti silenziosamente nelle impostazioni di una Parte. Le fixture registrano
anche modalità Single/Multi e versione firmware: un parametro introdotto da firmware
2.1 deve essere rifiutato in un contesto 1.1.

Le differenze firmware sono mantenute in
`src/data/summit-firmware-overrides.json`; non sovrascrivono né cancellano la
documentazione della guida base.

## Gate automatici

`pnpm validate:catalogs` controlla:

- ID, riferimenti, range, enum e posizioni fisiche/menu;
- binding tra layout e parametri;
- sorgenti, destinazioni e limiti slot Mod/FX Mod;
- copertura MIDI e traduzioni sicure;
- riferimenti degli override firmware;
- fixture valide per ogni menu patch-relevant;
- rifiuto delle fixture negative;
- aggiornamento di `docs/summit-catalog-coverage.md`.

Il report si rigenera con `pnpm catalog:coverage`. Le percentuali esprimono la quota
`verified`, non una stima della completezza di protocolli che Novation non ha
pubblicato.
