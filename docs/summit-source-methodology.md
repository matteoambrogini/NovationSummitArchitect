# Metodo per le fonti Summit

## Gerarchia delle fonti

1. [Pagina download ufficiale Summit](https://downloads.novationmusic.com/index.php/novation/synthesisers/summit).
2. Summit User Guide v1.1, copia ufficiale archiviata in `docs/references`.
3. Summit & Peak Firmware Update Addendum 2.1, copia ufficiale archiviata in `docs/references`.
4. [Guida ufficiale Novation Components per Summit/Peak](https://support.novationmusic.com/hc/en-gb/articles/360009550480-Components-Summit-Peak-Guide).

Forum, editor di terze parti e reverse engineering non sono fonti primarie accettabili.

## Processo di catalogazione

Per ogni parametro:

1. identificare etichetta, posizione fisica/menu e ambito;
2. verificare il range nella descrizione o nell'appendice MIDI;
3. registrare documento, sezione, pagina, URL e data;
4. aggiungere il controllo/layout o menu mapping corrispondente;
5. eseguire `pnpm validate:catalogs`;
6. aggiungere o aggiornare una fixture/test.

I valori leggibili sul pannello e i valori MIDI non devono essere confusi. Se una conversione non è documentata, si conserva il dominio verificato e si evita di produrre il mapping MIDI.

## Contenuto verificato nel Milestone 1

Il sottoinsieme include controlli essenziali di Osc 1, mixer, filtro, inviluppo amp, livelli FX e cinque parametri menu. Comprende inoltre un insieme conservativo di sorgenti/destinazioni Mod e FX Mod tratto dalle pagine 38–40 e 46.

## Politica per dati incerti

Un parametro dubbio viene omesso. `verificationStatus` è attualmente vincolato a `verified`; dati `unverified` dovranno vivere in un'area di ricerca separata e non essere disponibili al provider o alla UI.
