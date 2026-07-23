# Build macOS Apple Silicon e Intel

## Prerequisiti

1. macOS supportato da Tauri 2 e Xcode Command Line Tools.
2. Node.js 24, pnpm 11 e Rust stable.
3. Target Rust Apple Silicon e Intel.

## Comandi

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm install --frozen-lockfile
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
pnpm desktop:build -- --target universal-apple-darwin
```

La build macOS deve essere eseguita su macOS. Gli artifact sono sotto `src-tauri/target/universal-apple-darwin/release/bundle`.

## Firma e notarizzazione

Usare Developer ID Application, hardened runtime e notarizzazione Apple tramite secret CI. Verificare entitlements richiesti dall'accesso MIDI e non concedere permessi non necessari.

## Matrice di verifica

Eseguire smoke test su un Mac Apple Silicon e, dove ragionevole, su hardware Intel: app, file dialog, MIDI, display Retina, tastiera e reduced motion.
