# Build Windows 10/11

## Prerequisiti

1. Node.js 24 e pnpm 11.
2. Rust stable con target `x86_64-pc-windows-msvc`.
3. Microsoft Visual Studio Build Tools: “Desktop development with C++”.
4. WebView2 Runtime (presente normalmente su Windows 10/11 aggiornati).

## Comandi

```powershell
pnpm install --frozen-lockfile
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
pnpm desktop:build
```

Gli artifact Tauri sono generati sotto `src-tauri/target/release/bundle`.

## Firma

Configurare il certificato Windows tramite i meccanismi Tauri/CI e variabili segrete. Non inserire certificati o password nel repository.

## Verifica

Testare almeno Windows 10 22H2 e Windows 11 corrente: avvio, file dialog, salvataggio/apertura progetto, enumerazione MIDI con e senza Summit e rendering high-DPI.
