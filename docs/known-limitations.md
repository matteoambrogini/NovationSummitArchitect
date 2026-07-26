# Limiti noti

- Il catalogo copre solo il sottoinsieme necessario alla vertical slice; non è un catalogo completo Summit.
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
