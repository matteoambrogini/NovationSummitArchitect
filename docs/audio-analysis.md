# Analisi audio

## Contratto

`AudioFeatureSummary` separa feature deterministiche da interpretazione AI: durata/regione, pitch, inviluppo, spettro, modulazione, stereo e warning.

## Pipeline pianificata

1. Decodifica locale con limiti di formato, dimensione, durata e campioni.
2. Downmix analitico controllato, senza sostituire le metriche stereo.
3. Feature: RMS, transienti, attack/decay/release, centroid, roll-off, flatness, harmonicity, pitch/chroma, modulazione e correlazione stereo.
4. Normalizzazione con confidence e warning.
5. Invio delle sole feature al provider AI; audio inviato solo con consenso separato.

## Stato MVP

Il workbench implementa file validation, player, loop, gain e regione. La waveform è una rappresentazione UI deterministica, non un'estrazione DSP, e l'app non presenta valori tecnici simulati come misurati.

## Selezione librerie

La libreria di decoding/DSP verrà scelta soltanto dopo test di licenza, manutenzione e packaging Tauri su Windows e macOS. I buffer PCM non devono entrare nello store Zustand.
