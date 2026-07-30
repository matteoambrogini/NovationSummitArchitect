export const copy = {
  appName: "Summit Patch Architect",
  disclaimer:
    "Companion non ufficiale. Non affiliato, approvato o sponsorizzato da Novation o Focusrite.",
  nav: {
    home: "Home",
    newSound: "Nuovo suono",
    panel: "Pannello fisico",
    menus: "Display & menu",
    compare: "Confronta",
    settings: "Impostazioni",
  },
  panel: {
    interactionMode: "Modalità interazione",
    interact: "INTERACT",
    control: "CONTROL",
    pan: "PAN",
    panHint: "Trascina un controllo · Spazio + trascina o tasto centrale per spostare",
    calibration: "Calibrazione reference",
    calibrationOpen: "Apri calibrazione",
    calibrationClose: "Chiudi calibrazione",
    referencePhoto: "Foto",
    vectorPanel: "Vettore",
    grid: "Griglia",
    crosshair: "Mirino",
    controlCenters: "Centri controlli",
    photoOpacity: "Opacità foto",
  },
  modes: {
    text: "Patch dedotta dalla descrizione",
    reference:
      "Il link è usato come riferimento contestuale; l'audio non è stato estratto o analizzato.",
    audio:
      "Analisi assistita: l'estratto resta locale in modalità demo; le feature mostrate sono indicative.",
  },
  ai: {
    newSoundEyebrow: "GENERAZIONE OPENAI",
    newSoundTitle: "Che suono vuoi costruire?",
    newSoundDescription:
      "Descrivi attacco, corpo, movimento, spazio e ruolo musicale: OpenAI proporrà solo valori presenti nei cataloghi verificati.",
    textMode: "Descrizione testuale",
    descriptionLabel: "Descrizione sonora",
    descriptionPlaceholder:
      "Descrivi timbro, attacco, inviluppo, movimento, stereo e ruolo musicale…",
    textOnlyNotice:
      "Questa milestone usa esclusivamente testo. Riferimenti Spotify/YouTube, upload e analisi audio restano fuori dal flusso di generazione.",
    contractEyebrow: "CONTRATTO DI ANALISI",
    contractTitle: "Responses API · output strutturato",
    contractDescription:
      "Il backend invia solo la descrizione e un catalogo compatto. La risposta viene validata localmente prima di toccare la patch.",
    contractChecks: [
      "Structured Outputs con JSON Schema strict",
      "Validazione Zod e cataloghi locali",
      "Un tentativo automatico di repair",
      "Fallback parziale sicuro",
    ],
    flow: ["1 · Intento", "2 · Catalogo", "3 · Patch"],
    generate: "Genera patch con OpenAI →",
    generating: "Generazione e validazione…",
    privacy:
      "La chiave resta nel backend Tauri. La richiesta usa store: false e non include file o percorsi locali.",
    summaryEyebrow: "ANALISI AI VALIDATA",
    warnings: "Avvisi e assunzioni",
    sectionConfidence: "Confidenza per sezione",
    repairApplied: "Repair applicato",
    directOutput: "Output diretto",
    partialFallback: "Fallback parziale",
    completeValidation: "Validazione completa",
    brightness: "Brillantezza",
    movement: "Movimento",
    width: "Ampiezza",
    history: "Cronologia generazioni",
    activeProvider: "OpenAI · backend Tauri",
    backendOnly:
      "La credenziale è letta esclusivamente dal backend: variabile di processo o .env.local in sviluppo.",
  },
} as const;
