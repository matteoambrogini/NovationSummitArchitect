# Limiti noti

## Catalogo Summit

- La guida base dichiara quattro pagine Voice; la guida online descrive anche pagina 5
  e il firmware 2.1 sposta Spread e altri parametri. Le posizioni alternative sono
  conservate, ma il menu resta `conflict`.
- La guida base descrive 38 destinazioni Mod, mentre la tabella MIDI usa valori raw
  0–36. Il catalogo non forza una corrispondenza; include separatamente le 11
  destinazioni aggiunte dal firmware 2.1.
- La tabella MIDI documenta i campi NRPN completi solo per lo slot Mod 1. Gli slot
  2–16 non vengono ricavati per progressione numerica.
- Oscillator Coarse ha dominio fisico ±12 semitoni, ma la tabella MIDI riporta
  -128…127; il mapping è `conflict`.
- Oscillator Manual Shape è -63…63 nella guida e -64…63 nella tabella MIDI; il
  mapping resta `conflict`.
- Le 60 voci WaveMore sono pubblicate; le prime 50 wavetable di fabbrica sono
  AI-usable, mentre gli ultimi dieci slot sostituibili dall'utente vengono rifiutati.
- Le tre profondità Manual delle rotte FM sono verificate 0…127. Le sei profondità
  LFO 2/Mod Env 2 restano `unverified`: le fonti ne confermano la semantica additiva,
  ma non pubblicano dominio, default o traduzione MIDI.
- I livelli A/B del Multi non hanno un range esplicito confermato; restano `unknown`.
- Arp Octaves è descritto come 1–7 in un passaggio narrativo, ma menu e MIDI indicano
  1–6; il parametro è `conflict`.
- Reverb Size ha default 64 nella guida e nella tabella MIDI, ma 90 nella guida
  online. Il conflitto è limitato all'attributo `defaultValue`; il dominio 0–127 e il
  parametro restano verificati.
- Il limite inferiore di FX Mod Depth è stampato come “64” senza segno, benché la
  descrizione parli di valori negativi. Il dominio prudente -64…63 è registrato come
  `conflict`.
- Un passaggio online cita 16 slot FX Mod, mentre la sezione dedicata e la guida
  confermano quattro slot. Il catalogo usa quattro e conserva la discrepanza.
- La guida base conta otto pagine FX, mentre le schermate firmware 2.1 arrivano a
  `/10`; il menu è `conflict`.
- Le coppie CC a 8 bit sono registrate, ma ordine dei messaggi e formula di
  composizione non vengono assunti quando la fonte non li specifica.
- Arp Chance pubblica 1–100 nella tabella MIDI e 10–100 nel menu firmware 2.1; il
  mapping esiste ed è verificato, ma la traduzione resta `conflict` e non è AI-usable.
- L'assenza di un parametro dalla lista MIDI non prova che sia impossibile
  controllarlo: viene registrata come `officially-absent`, non come protocollo
  inventato.

Il dettaglio quantitativo è nel
[report di copertura](summit-catalog-coverage.md); fonti e criteri sono descritti nel
[metodo di verifica](summit-source-methodology.md).

## Prodotto

- Il mock provider seleziona fixture con keyword e non esegue ragionamento generativo.
- L'audio workbench non estrae ancora feature DSP; la waveform è una rappresentazione UI.
- Spotify/YouTube non interrogano metadata API e non incorporano player nell'MVP.
- Il keychain non è ancora collegato; il campo API key resta in memoria e il provider OpenAI è disabilitato.
- Salvataggio/apertura nativo richiedono la shell Tauri; nel browser il salvataggio usa download JSON.
- Autosave recovery, duplicazione esplicita ed export guida stampabile/immagine pannello sono in roadmap.
- La diagnostica MIDI enumera le porte ma non mostra ancora messaggi raw.
- Nessun CC, NRPN o SysEx viene inviato.
- Il toolchain Rust non è incluso nel runtime JavaScript del repository e deve essere installato sulla macchina di build.
- Packaging, firma e notarizzazione macOS devono essere verificati su un Mac reale.
