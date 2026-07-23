# Product requirements — Milestone 1

## Obiettivo

Permettere a un musicista di descrivere un suono e ottenere una proposta Summit trasparente, modificabile e riproducibile manualmente, senza credenziali e senza dichiarare di avere analizzato audio non ricevuto.

## Persona e job-to-be-done

Il musicista conosce il proprio Summit ma vuole accorciare la traduzione tra linguaggio sonoro e controlli. Deve poter capire cosa impostare, perché, con quale confidenza e in quale ordine.

## Flusso MVP

1. Inserimento descrizione sonora.
2. Link Spotify/YouTube opzionale, con timestamp e suono target obbligatorio.
3. Estratto locale opzionale con selezione della regione.
4. Selezione automatica della modalità text, reference-only o audio-assisted.
5. Generazione tramite provider mock.
6. Validazione Zod e catalogo.
7. Visualizzazione pannello, menu, modulazioni, assunzioni e confidenza.
8. Modifica manuale o raffinamento naturale a delta.
9. Confronto versioni e salvataggio progetto.

## Criteri implementati

- UI italiana e copy centralizzato di base.
- Nessuna API key richiesta.
- Cinque fixture demo.
- Parametri mostrati solo se verificati.
- Pannello SVG originale; nessuna fotografia Novation redistribuita.
- Link streaming mai scaricati.
- MIDI nativo limitato alla diagnostica delle porte.
- Disclaimer non ufficiale persistente.

## Fuori scope del Milestone 1

- catalogo completo;
- DSP reale e waveform estratta dai campioni;
- provider OpenAI/Spotify/YouTube operativo;
- keychain, autosave recovery e migrazioni oltre la versione iniziale;
- invio MIDI o trasferimento patch;
- packaging firmato/notarizzato.
