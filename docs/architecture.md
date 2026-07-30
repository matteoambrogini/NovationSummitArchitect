# Architettura

## Vista d'insieme

```text
React routes + SVG panel/menu UI
        |
Zustand: patch versions + safe AI insight
        |
OpenAI provider adapter
        |
Zod contract -> Summit catalogs -> full proposal
        |
Tauri invoke: generate_summit_patch
        |
Rust: credential gate + Responses API (store: false)
```

## Frontiere

### Backend Tauri

`src-tauri` possiede credenziali, rete e API native. Il comando
`generate_summit_patch` valida l'input, carica la configurazione backend-only, invia
la richiesta HTTPS e traduce stato HTTP, refusal e incomplete response in errori
applicativi tipizzati. Il backend non interpreta il dominio Summit oltre a limitare
lo Structured Output al catalogo compatto ricevuto.

### Provider AI

`src/ai/openAiProvider.ts` dipende dal comando Tauri ma non modifica direttamente lo
store. Coordina prima risposta, validazione, un singolo repair e fallback. I tipi
OpenAI non raggiungono `src/domain`.

### Dominio Summit

I JSON sotto `src/data` sono la knowledge base verificata.
`src/ai/catalogContext.ts` ne produce una proiezione minima per il provider.
`src/ai/patchAssembler.ts` applica il delta a default locali verificati e usa
`src/domain/catalog.ts` come autorità finale.

### Stato e UI

Zustand conserva proposte complete, indice attivo e insight sicuri. Ogni generazione,
raffinamento o modifica manuale crea una versione; pannello fisico, Display & Menus,
Setup Mode e confronto leggono la stessa `SummitPatchProposal`.

La cronologia AI non viene aggiunta al formato `.summitproject` 1.0.0, evitando una
modifica silenziosa del formato. I progetti esistenti continuano ad aprirsi e
ricevono insight vuoti.

## Dati inviati e conservati

Vengono inviati:

- descrizione testuale e istruzione di raffinamento;
- firmware e scope;
- solo valori non-default della patch corrente;
- ID, range, default, posizione e descrizione sonora dei parametri AI-usable;
- entità Mod/FX Mod verificate.

Non vengono inviati audio, link streaming, file progetto, percorsi, documenti Summit
o credenziali. Nello stato applicativo restano solo modello, request ID, durata,
token usage, esito, confidenza, assunzioni e warning.

## Compatibilità

Il client usa `reqwest` con TLS Rustls, evitando dipendenze da OpenSSL e mantenendo la
stessa implementazione su Windows 10/11 e macOS Intel/Apple Silicon. Le chiamate
OpenAI non sono disponibili nella build browser-only.
