# Product requirements — Milestone generazione AI

## Obiettivo

Permettere a un musicista di descrivere un suono e ottenere tramite OpenAI una
proposta Summit trasparente, validata, modificabile e riproducibile manualmente,
senza dichiarare di avere analizzato audio non ricevuto.

## Persona e job-to-be-done

Il musicista conosce il proprio Summit ma vuole accorciare la traduzione tra linguaggio sonoro e controlli. Deve poter capire cosa impostare, perché, con quale confidenza e in quale ordine.

## Flusso MVP

1. Inserimento descrizione sonora.
2. Generazione via Responses API con Structured Outputs strict e `store: false`.
3. Validazione Zod e cataloghi Summit.
4. Un repair automatico o fallback parziale sicuro.
5. Visualizzazione pannello, menu, modulazioni, assunzioni e confidenza.
6. Modifica manuale o raffinamento naturale a delta.
7. Cronologia, confronto versioni e salvataggio progetto.

## Criteri implementati

- UI italiana e copy centralizzato di base.
- Credenziale disponibile soltanto al backend Tauri.
- Cinque fixture demo.
- Provider OpenAI operativo con modello configurabile.
- Parametri mostrati solo se verificati.
- Pannello SVG originale; nessuna fotografia Novation redistribuita.
- Link streaming mai scaricati.
- MIDI nativo limitato alla diagnostica delle porte.
- Disclaimer non ufficiale persistente.

## Fuori scope del Milestone 1

- catalogo completo;
- DSP reale e waveform estratta dai campioni;
- provider Spotify/YouTube operativo;
- keychain, autosave recovery e migrazioni oltre la versione iniziale;
- invio MIDI o trasferimento patch;
- packaging firmato/notarizzato.
