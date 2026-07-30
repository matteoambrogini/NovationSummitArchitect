# Contratto AI

## Flusso operativo

La descrizione testuale attraversa questa pipeline:

1. React invia al comando Tauri `generate_summit_patch` una descrizione, il firmware
   target e un catalogo AI-usable compatto.
2. Rust legge la credenziale soltanto dal processo o, in sviluppo, da `.env.local`.
3. Il backend chiama `POST /v1/responses` con `store: false`.
4. La Responses API restituisce un delta tramite Structured Outputs e JSON Schema
   strict.
5. Il frontend valida l'oggetto con Zod e poi ogni ID, valore, posizione e routing
   contro i cataloghi locali.
6. Il delta valido viene applicato a una Init Patch deterministica completa, oppure
   alla patch corrente durante un raffinamento.
7. Se la validazione fallisce viene eseguita una sola richiesta di repair. Dopo un
   secondo fallimento vengono conservate soltanto le modifiche localmente valide; se
   la struttura non è recuperabile resta la Init Patch sicura.

Il formato vendor non entra negli schemi di dominio. `PatchProvider` restituisce una
`SummitPatchProposal` completa e metadati provider-neutral; request ID, modello,
durata e token usage restano separati dalla patch.

## Contratto strutturato

L'output AI dichiara:

- versione schema, nome, categoria, descrizione e sintesi;
- analisi sonora con brillantezza, movimento, larghezza e caratteri timbrici;
- delta `settings` con `parameterId`, valore, motivazione e confidenza;
- slot Mod Matrix e FX Mod Matrix con ID esatti e depth;
- confidenza per sezione, assunzioni e avvisi.

Lo schema JSON viene costruito con gli ID effettivamente esposti dai cataloghi per il
firmware target. Tutti i campi degli oggetti sono obbligatori e
`additionalProperties` è `false`, come richiesto dalla modalità strict.

## Gate locale

La validazione non considera affidabile il solo rispetto dello schema remoto:

1. parse della busta Tauri e dell'output con Zod;
2. versione del contratto e tipi primitivi;
3. parameter ID, scope Part e posizione panel/menu;
4. range, step, enum e sottoinsiemi enum stabili per l'AI;
5. applicabilità al firmware target;
6. slot, sorgenti, destinazioni e depth delle matrici;
7. parse finale di `SummitPatchProposal`;
8. `validateProposalAgainstCatalog` sull'intera patch.

`conflict`, `unverified`, `unknown`, entità non `aiExposed` e valori non applicabili al
firmware non vengono mai applicati.

## Privacy e configurazione

La chiave non attraversa il boundary Tauri e non viene salvata nel progetto, nella UI
o in `localStorage`. La precedenza è:

1. `OPENAI_API_KEY` nell'ambiente del processo;
2. `.env.local` soltanto in build debug;
3. errore tipizzato `missing_api_key`.

`OPENAI_MODEL` segue la stessa precedenza; il default è `gpt-5.4-mini`. Ogni richiesta
usa `store: false` e invia solo il contesto minimo necessario. Non vengono registrati
prompt, output, cataloghi, percorsi o segreti.

## Errori

Il backend distingue configurazione mancante, autenticazione, permessi, rate limit,
credito esaurito, limiti di spesa di organizzazione o progetto, limite di utilizzo
dell'organizzazione, quota generica, modello non disponibile, timeout, rete, refusal,
risposta incompleta, output malformato e indisponibilità del provider. Per gli errori
di fatturazione usa il campo `error.code`, non il più generico `error.type`. Gli
errori esposti alla UI sono tipizzati, localizzati e non includono il corpo grezzo
della risposta.

## Fonti OpenAI ufficiali

Verificate il 2026-07-30:

- [Responses API](https://platform.openai.com/docs/api-reference/responses/create)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Conversation state e `store: false`](https://developers.openai.com/api/docs/guides/conversation-state)
- [Error codes](https://developers.openai.com/api/docs/guides/error-codes)
- [Spend limits](https://developers.openai.com/api/docs/guides/spend-limits)
- [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
