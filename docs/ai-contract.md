# Contratto AI

## Principio

Il provider non produce prosa libera come risultato primario. Restituisce `SummitPatchProposal` o `SummitPatchDelta`, validato prima con Zod e poi contro i cataloghi.

## Gate di sicurezza

1. Parse JSON.
2. Validazione dello schema e della versione.
3. Verifica parameter ID e posizione panel/menu.
4. Verifica range, enum e scope.
5. Verifica sorgenti/destinazioni Mod e FX Mod.
6. Se fallisce: richiesta di repair; dopo un secondo fallimento, risultato parziale sicuro e log privo di segreti.

## Provider

`PatchProvider` espone `generate` e `refine`. Il mock provider è deterministico e privo di rete. Un futuro adapter OpenAI dovrà mappare la risposta nel dominio senza esporre tipi vendor all'app.

## Prompt versionati

- `summit-patch-system-v1.ts`
- `summit-refinement-system-v1.ts`
- `summit-repair-json-v1.ts`

Le regression fixture devono verificare: rifiuto di parametri inventati, distinzione panel/menu, range, Part A/B, Single/Multi, link reference-only e delta minimo.
