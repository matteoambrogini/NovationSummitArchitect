# AGENTS.md

Queste istruzioni valgono per tutto il repository.

1. Mantieni TypeScript in modalità strict; evita `any`, cast non motivati e dati esterni non validati.
2. Non inventare mai parametri Summit, range, menu, short label, sorgenti/destinazioni di modulazione, CC, NRPN o SysEx.
3. Ogni modifica ai cataloghi deve aggiornare nello stesso commit documento, sezione, pagina, URL e data di verifica.
4. Dopo una modifica ai cataloghi esegui `pnpm validate:catalogs` e i test relativi.
5. Mantieni provider AI/metadata separati dal dominio, dagli schemi e dall'interfaccia.
6. Le risposte AI devono essere validate con Zod e poi contro i cataloghi; in caso di errore usa un risultato parziale sicuro.
7. Non committare segreti, non registrarli nei log e non usare `localStorage` per le credenziali.
8. Mantieni compatibilità Windows 10/11 e macOS Apple Silicon/Intel. Le API native passano da Tauri/Rust.
9. Aggiungi una migrazione quando cambia la versione di `.summitproject`; non aprire silenziosamente formati sconosciuti.
10. Non implementare invio MIDI, patch dump o SysEx senza protocollo ufficiale verificato e test hardware espliciti.
11. Spotify e YouTube sono riferimenti contestuali: nessun download o estrazione audio.
12. Centralizza le stringhe UI in `src/i18n`; l'italiano è la lingua predefinita.
13. Prima di una consegna esegui, per quanto consentito dall'ambiente: catalog validation, lint, test, build e test Rust.
