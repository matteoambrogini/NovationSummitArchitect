# Architettura

## Vista d'insieme

```text
React routes + SVG UI
        |
Zustand application store
        |
domain schemas / catalog validation / patch delta
        |
provider interfaces ---- mock provider (MVP)
        |
Tauri invoke boundary
        |
Rust: project I/O + native MIDI diagnostics
```

## Domini

### Desktop shell

`src-tauri` possiede la frontiera nativa. I comandi espongono operazioni piccole e validate: lettura/scrittura `.summitproject` e enumerazione MIDI. Il frontend funziona anche in browser con fallback di esportazione JSON.

### Summit knowledge base

I file JSON sotto `src/data` sono dati, non logica UI. `src/domain/catalog.ts` li valida e applica vincoli incrociati alle proposte. Il catalogo MVP è incompleto per scelta: un parametro non verificato viene omesso.

### Sound-analysis pipeline

Il contratto è definito da `PatchGenerationRequest` e da `AudioFeatureSummary`. Il Milestone 1 usa descrizione e fixture deterministiche. Il workbench audio raccoglie regione/gain/loop senza simulare feature DSP reali.

### Patch editor

Il componente SVG consuma `summit-control-layout.json`; l'inspector consuma le definizioni. Modifiche manuali e raffinamenti producono nuove versioni, conservando il confronto.

### AI provider layer

`PatchProvider` impedisce al dominio di dipendere dal formato di un singolo vendor. Ogni output attraversa schema Zod e validazione contro cataloghi. I prompt sono versionati sotto `src/ai/prompts`.

## Stato e persistenza

Zustand conserva input, versioni e selezione UI; grandi buffer audio non entrano nello store. Il file progetto contiene riferimenti e proposte, mai l'audio automaticamente. L'estensione nativa è `.summitproject`.

## Sicurezza

La superficie Tauri espone solo i comandi necessari. Nessun segreto è salvato nel frontend. Nessuna chiamata di rete è necessaria per la demo.
