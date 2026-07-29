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
} as const;
