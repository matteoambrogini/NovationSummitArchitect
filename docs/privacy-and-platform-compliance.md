# Privacy e conformità piattaforme

## Spotify e YouTube

I link sono identificatori e riferimenti contestuali. L'app non scarica, estrae, separa o aggira la riproduzione ufficiale. Le API metadata saranno adapter opzionali con fallback a inserimento manuale.

## Audio dell'utente

Il file deve essere posseduto o usato legittimamente dall'utente. Resta locale per impostazione predefinita, non viene copiato nel progetto senza informativa e non viene inviato a un provider cloud senza consenso esplicito e riepilogo dei dati in uscita.

## Credenziali

- sviluppo: variabili d'ambiente e `.env` ignorato;
- produzione: keychain del sistema operativo tramite plugin Tauri mantenuto;
- mai `localStorage`, log, analytics o crash report in chiaro;
- azione esplicita per eliminare le credenziali.

## File locali

Il formato `.summitproject` è JSON versionato e validato. Percorsi e input sono controllati sul boundary Rust. I file audio non sono inclusi automaticamente.

## Disclaimer

L'interfaccia deve mostrare sempre che il prodotto è un companion non ufficiale non affiliato o approvato da Novation/Focusrite. La vista pannello è originale e funzionale; non contiene fotografia di prodotto.
