# Contratto AI

## Principio

Il provider non produce prosa libera come risultato primario. Restituisce `SummitPatchProposal` o `SummitPatchDelta`, validato prima con Zod e poi contro i cataloghi.

## Gate di sicurezza

1. Parse JSON.
2. Validazione dello schema e della versione.
3. Verifica parameter ID e posizione panel/menu.
4. Verifica range, enum e scope.
5. Verifica applicabilità del parametro, della posizione menu e del valore enum rispetto
   al firmware target.
6. Verifica sorgenti/destinazioni Mod e FX Mod applicabili allo stesso target.
7. Se fallisce: richiesta di repair; dopo un secondo fallimento, risultato parziale
   sicuro e log privo di segreti.

Il target predefinito è Summit firmware 2.1, dichiarato in
`src/data/summit-catalog-target.json`. `targetFirmware` può essere incluso nella
proposta o passato esplicitamente al validatore. Lo stato `verified` non implica da
solo la compatibilità: le aggiunte 2.1 sono utilizzabili su 2.1 e rifiutate sui target
precedenti. `conflict`, `unverified` e `unknown` non sono mai esposti.

Per gli enum con slot configurabili dall'utente, come WaveMore, il catalogo può
limitare il sottoinsieme stabile consentito all'AI anche quando il selettore completo è
documentato.

Le impostazioni di Parte restano in `parts`; i controlli con scope `multi` usano
l'oggetto opzionale `multiSetup`, consentito soltanto quando `patch.mode` è `multi`.
Questo evita di inserire silenziosamente Split Point, modalità o selezioni Patch nelle
impostazioni di una singola Parte.

## Provider

`PatchProvider` espone `generate` e `refine`. Il mock provider è deterministico e privo di rete. Un futuro adapter OpenAI dovrà mappare la risposta nel dominio senza esporre tipi vendor all'app.

## Prompt versionati

- `summit-patch-system-v1.ts`
- `summit-refinement-system-v1.ts`
- `summit-repair-json-v1.ts`

Le regression fixture devono verificare: rifiuto di parametri inventati, distinzione
panel/menu, range, Part A/B, Single/Multi, compatibilità firmware di parametri,
posizioni ed enum, esclusione degli stati non sicuri, link reference-only e delta
minimo.
