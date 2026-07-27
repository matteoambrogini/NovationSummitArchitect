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
- `unknown`: l'entità è visibile o nominata, ma il dato necessario non è pubblicato;
- `deprecated`: il dato è ufficialmente superato, ma resta necessario per la
  compatibilità storica.

La verifica e l'applicabilità firmware sono assi indipendenti. `introducedInFirmware`
e `removedInFirmware` definiscono l'intervallo di compatibilità senza declassare
un'entità ufficiale: un parametro introdotto in 2.1 può quindi essere `verified` e
AI-usable sul target 2.1, ma viene rifiutato su 1.1.

Solo parametri con `verificationStatus: "verified"`, `aiExposed: true` e applicabilità
al target entrano nel catalogo AI. Un mapping MIDI è utilizzabile solo se esistenza,
traduzione e applicabilità sono tutte verificate. Lo stato del mapping non viene più
usato per descrivere l'incertezza della traduzione.

## Ambiti e firmware

`part`, `multi` e `global` sono ambiti distinti. I parametri globali e Multi non possono
essere inseriti silenziosamente nelle impostazioni di una Parte. Le fixture registrano
anche modalità Single/Multi e versione firmware: un parametro introdotto da firmware
2.1 deve essere rifiutato in un contesto 1.1.

Il target primario è dichiarato in `src/data/summit-catalog-target.json`; in questa
revisione è Summit firmware 2.1. Anche le posizioni menu e i singoli valori enum possono
avere un intervallo firmware distinto dal parametro.

Le differenze firmware sono mantenute in
`src/data/summit-firmware-overrides.json`; non sovrascrivono né cancellano la
documentazione della guida base.

Nel catalogo MIDI, `officially-absent` significa esclusivamente che il parametro non
compare nella lista completa pubblicata da Novation. Non è prova di non-controllabilità
e non autorizza a inferire CC, NRPN o SysEx.

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

Il report si rigenera con `pnpm catalog:coverage`. La metrica principale è
“AI usable @ firmware 2.1”: richiede verifica, esposizione AI e applicabilità. La
copertura MIDI resta separata e non entra nelle soglie di sound-design.
