# Summit Patch Architect

Summit Patch Architect è un companion non ufficiale per progettare patch approssimative per Novation Summit a partire da una descrizione sonora. La build desktop usa OpenAI per proporre un delta che viene validato localmente e applicato a una Init Patch deterministica.

> Il progetto non è affiliato, approvato o sponsorizzato da Novation o Focusrite. Non scarica audio da Spotify o YouTube e non invia messaggi MIDI non documentati.

## Stato attuale

Sono disponibili:

- shell React/TypeScript in italiano, eseguibile nel browser e predisposta per Tauri 2;
- creazione di una patch da una descrizione testuale tramite OpenAI Responses API;
- Structured Outputs con JSON Schema strict, `store: false`, validazione Zod e cataloghi;
- repair automatico singolo e fallback parziale sicuro;
- pannello fisico Summit originale, inspector dei controlli e modifica manuale dei valori;
- pagine Display & menu, Mod Matrix e FX Mod Matrix;
- raffinamenti a delta, cronologia e confronto tra versioni;
- salvataggio e riapertura del formato `.summitproject` verificati nel browser; il percorso nativo Tauri è implementato ma richiede una build desktop valida per essere verificato;
- cataloghi Summit verificati e validati in modo incrociato;
- enumerazione MIDI nativa Rust in sola lettura, implementata ma ancora da provare con la shell desktop e hardware reale;
- test unitari, component test ed E2E Chromium.

Restano simulate o incomplete l'analisi audio DSP, l'uso effettivo di link Spotify/YouTube e l'invio MIDI alla macchina.

## Versioni consigliate

- Node.js 24 LTS;
- pnpm 11.9.0, il package manager dichiarato in `package.json`;
- Rust 1.97.1 con Cargo, fissato in `rust-toolchain.toml`, solo per Tauri;
- Git.

Verifica la toolchain:

```text
node --version
pnpm --version
rustc --version
cargo --version
pnpm tauri --version
```

## Windows

1. Installa Node.js 24 LTS e poi pnpm:

   ```powershell
   npm install --global pnpm@11.9.0
   ```

2. Installa Rust tramite `rustup`; il file `rust-toolchain.toml` seleziona automaticamente Rust 1.97.1. Su Windows assicurati di usare il target MSVC:

   ```powershell
   rustup toolchain install 1.97.1-x86_64-pc-windows-msvc --profile minimal
   rustup default 1.97.1-x86_64-pc-windows-msvc
   ```

3. Installa **Visual Studio 2022 Build Tools**. Nel Visual Studio Installer seleziona il workload **Desktop development with C++** e assicurati che includa:

   - MSVC v143 C++ x64/x86 build tools;
   - Windows 10 SDK o Windows 11 SDK;
   - C++ CMake tools for Windows, consigliato.

   Visual Studio Code non sostituisce questi componenti. Se Cargo segnala `link.exe not found`, il workload C++ non è installato o il terminale va riaperto dopo l'installazione.

4. Installa o aggiorna **Microsoft Edge WebView2 Evergreen Runtime**. Su Windows 11 è normalmente già presente.

5. Dalla cartella del progetto:

   ```powershell
   pnpm install --frozen-lockfile
   pnpm start:local
   ```

   La demo web è disponibile su `http://127.0.0.1:1420`. Per la finestra desktop Tauri:

   ```powershell
   pnpm desktop:dev
   ```

   Per creare gli installer desktop:

   ```powershell
   pnpm desktop:build
   ```

## macOS

1. Installa le Xcode Command Line Tools:

   ```bash
   xcode-select --install
   ```

2. Installa Node.js 24 LTS, pnpm 11.9.0 e Rust tramite `rustup`. Il repository seleziona Rust 1.97.1:

   ```bash
   npm install --global pnpm@11.9.0
   rustup toolchain install 1.97.1 --profile minimal
   ```

   Se `rustup` non è ancora presente, installalo prima dal sito ufficiale Rust e riapri il terminale.

3. Dalla cartella del progetto:

   ```bash
   pnpm install --frozen-lockfile
   pnpm start:local
   ```

   Per la shell desktop:

   ```bash
   pnpm desktop:dev
   ```

   Per una build macOS locale:

   ```bash
   pnpm desktop:build
   ```

   La build universale richiede entrambi i target Rust:

   ```bash
   rustup target add aarch64-apple-darwin x86_64-apple-darwin
   pnpm desktop:build -- --target universal-apple-darwin
   ```

La build macOS deve essere eseguita, firmata e notarizzata su macOS; non viene cross-compilata da Windows.

## Cloud build con GitHub Actions

Il workflow **Build desktop installers**, definito in `.github/workflows/build-desktop.yml`, esegue tutti i controlli su runner GitHub e avvia le build Tauri solo se i quality gate sono superati. Non usa chiavi applicative, non crea release e conserva gli artefatti per 14 giorni. Windows è unsigned; macOS usa soltanto una firma ad-hoc, senza certificato Developer ID e senza notarizzazione.

I job sono separati:

- `Quality gates` su Ubuntu esegue lint, typecheck, test frontend, test Rust, validazione cataloghi, build frontend ed E2E Chromium;
- `Windows x64` usa `windows-2025` e richiede sia MSI sia NSIS;
- `macOS Apple Silicon` usa il runner ARM64 `macos-15` e il target `aarch64-apple-darwin`;
- `macOS Intel` usa il runner Intel `macos-15-intel` e il target `x86_64-apple-darwin`.

Per avviare una build manuale:

1. apri il repository su GitHub e seleziona la scheda **Actions**;
2. nella colonna dei workflow scegli **Build desktop installers**;
3. premi **Run workflow**;
4. scegli il branch che contiene il workflow, normalmente `main`, e conferma con **Run workflow**;
5. attendi che `Quality gates` e i tre job desktop siano verdi;
6. apri il run completato e, nella sezione **Artifacts**, scarica il bundle desiderato.

Gli artefatti previsti sono:

- `summit-patch-architect-windows`: installer `.msi`, installer NSIS `.exe`, eseguibile Windows non impacchettato e log Tauri;
- `summit-patch-architect-macos-arm64`: `.dmg`, `.app.zip` Apple Silicon e log Tauri;
- `summit-patch-architect-macos-x64`: `.dmg`, `.app.zip` Intel e log Tauri.

Su Windows usa normalmente il `.msi` oppure il setup NSIS `.exe`. L'eseguibile nella cartella `unbundled` è fornito per verifica tecnica, ma Tauri non lo considera una modalità portabile ufficiale e sul computer di destinazione richiede comunque WebView2.

Su macOS usa il `.dmg`; lo `.app.zip` conserva correttamente la struttura e i permessi dell'app bundle ed è utile per test o ispezione. Le architetture sono pubblicate separatamente, non come universal binary.

Le build non hanno ancora una firma attendibile per la distribuzione. Windows può mostrare Microsoft Defender SmartScreen con autore sconosciuto; macOS può mostrare Gatekeeper con sviluppatore non verificato anche con la firma ad-hoc. Esegui soltanto artefatti scaricati dal run del tuo repository. Per un test macOS, dopo avere verificato la provenienza, usa il menu contestuale **Apri** o **Impostazioni di Sistema → Privacy e Sicurezza → Apri comunque**. Certificati, notarizzazione e release pubbliche verranno configurati in una fase successiva.

### Troubleshooting della cloud build

**Dipendenze Node**

- Il workflow usa Node 24 e pnpm 11.9.0.
- Se `pnpm install --frozen-lockfile` fallisce, `package.json` e `pnpm-lock.yaml` non sono sincronizzati: aggiorna intenzionalmente il lockfile con la stessa versione di pnpm e committalo.
- La cache contiene lo store pnpm, non `node_modules`; l'installazione viene sempre eseguita.

**Errori Cargo**

- Il workflow usa Rust 1.97.1 e `cargo test --locked`.
- Se Cargo segnala che il lockfile deve essere aggiornato, rigenera e committa `src-tauri/Cargo.lock`.
- Il job Ubuntu installa le dipendenze WebKitGTK/GTK richieste da Tauri e `midir`; un errore successivo va cercato nel passo **Rust tests**.
- Ogni job usa una cache Cargo distinta per sistema e architettura, evitando di riutilizzare binari incompatibili.

**Bundle target mancanti**

- Windows invoca esplicitamente `--bundles msi,nsis` e fallisce se manca uno dei due installer.
- I job macOS invocano `--bundles app,dmg` e falliscono se non trovano sia il DMG sia l'app bundle.
- Controlla che `bundle.active` sia `true` e che `bundle.targets` non escluda il formato richiesto.

**Problemi WebView2**

- I runner Windows GitHub includono Visual Studio Build Tools e i componenti di sistema necessari alla compilazione.
- WebView2 è richiesto per eseguire l'app sul computer Windows di destinazione; se l'app non parte, installa Microsoft Edge WebView2 Evergreen Runtime.

**Build macOS**

- ARM64 e Intel sono job nativi separati: un successo su una piattaforma non implica il successo dell'altra.
- La configurazione macOS usa la pseudo-identità `-` per la firma ad-hoc; non sono configurate credenziali Apple né notarizzazione.
- Un avviso Gatekeeper dopo il download è prevedibile per un bundle unsigned e non indica da solo una build corrotta.

**Artefatti non caricati**

- Gli artefatti applicativi vengono caricati soltanto dopo una build e uno staging riusciti.
- Se una build Tauri fallisce, il job rimane rosso e tenta di caricare un artefatto `*-failed-log` contenente il log disponibile; non viene ignorato alcun errore.
- Se il job è verde ma la sezione **Artifacts** è vuota, controlla il passo **Upload ... bundles** e le quote/retention Actions del repository.
- Il workflow carica soltanto installer, app bundle compressi ed essenziali log di build: non include audio, documenti Novation, `.env` o sorgenti come artefatti.

## Configurazione OpenAI

La generazione è disponibile soltanto nella shell Tauri: la WebView non legge né riceve la credenziale. Il backend cerca `OPENAI_API_KEY` prima nell'ambiente di processo e, solo nelle build di sviluppo, in `.env.local` nella root del repository. Il file è ignorato da Git.

1. copia `.env.example` in `.env.local`;
2. assegna `OPENAI_API_KEY` senza prefisso `VITE_`;
3. opzionalmente imposta `OPENAI_MODEL`; il default è `gpt-5.4-mini`;
4. avvia `pnpm desktop:dev`.

Non committare, stampare nei log o salvare la chiave in `localStorage`. Il browser può mostrare e modificare le fixture demo, ma la chiamata OpenAI richiede il comando nativo Tauri.

Il backend invia soltanto descrizione, firmware target, un eventuale riepilogo compatto della patch corrente e l'insieme AI-usable dei cataloghi. Non invia file, percorsi locali o progetti completi. Dei risultati conserva nello stato UI solo metadati operativi sicuri: modello, request ID, durata, uso token, esito e categoria d'errore.

## Test e controlli

Installa una volta Chromium per Playwright, se manca:

```text
pnpm exec playwright install chromium
```

Esegui i controlli separatamente:

```text
pnpm validate:catalogs
pnpm lint
pnpm typecheck
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm test:e2e
pnpm desktop:build
```

`pnpm check` aggrega validazione cataloghi, lint, typecheck, test frontend e build frontend. Il test E2E avvia automaticamente `pnpm start:local` e verifica anche salvataggio, reload e riapertura del progetto.

## Privacy e limiti delle fonti

- I link Spotify/YouTube sono usati soltanto come contesto e non attivano download, ripping o demux.
- Il workbench audio mostra selezione e regione, ma il DSP reale è pianificato per una fase successiva.
- Gli estratti audio restano locali e non vengono copiati automaticamente nel file progetto.
- La patch generata è una proposta approssimativa: non viene dichiarata una ricostruzione esatta di un master commerciale.

## Documentazione

- [Requisiti di prodotto](docs/product-requirements.md)
- [Architettura](docs/architecture.md)
- [Metodo per le fonti Summit](docs/summit-source-methodology.md)
- [Analisi audio](docs/audio-analysis.md)
- [Contratto AI](docs/ai-contract.md)
- [Roadmap MIDI](docs/midi-roadmap.md)
- [Privacy e conformità](docs/privacy-and-platform-compliance.md)
- [Limiti noti](docs/known-limitations.md)
- [Metodo di verifica delle fonti Summit](docs/summit-source-methodology.md)
- [Copertura del catalogo Summit](docs/summit-catalog-coverage.md)
