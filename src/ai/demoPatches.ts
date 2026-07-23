import { summitPatchProposalSchema, type SummitPatchProposal } from "../domain/schemas";

type DemoConfig = {
  id: string;
  name: string;
  category: SummitPatchProposal["patch"]["category"];
  description: string;
  keywords: string[];
  values: {
    wave: "Sine" | "Triangle" | "Sawtooth" | "Square/Pulse" | "more";
    shape: number;
    osc1: number;
    osc2: number;
    osc3: number;
    noise: number;
    cutoff: number;
    resonance: number;
    overdrive: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    chorus: number;
    delay: number;
    reverb: number;
    drift: number;
  };
};

export const demoConfigs: DemoConfig[] = [
  {
    id: "progressive-pluck",
    name: "Aurora Pluck",
    category: "pluck",
    description: "Pluck progressive-house brillante, corto e largo.",
    keywords: ["pluck", "progressive", "sharp", "brillante", "transient"],
    values: { wave: "Sawtooth", shape: 8, osc1: 235, osc2: 172, osc3: 64, noise: 14, cutoff: 185, resonance: 42, overdrive: 18, attack: 0, decay: 42, sustain: 18, release: 28, chorus: 45, delay: 36, reverb: 31, drift: 7 },
  },
  {
    id: "cinematic-pad",
    name: "Cinder Pad",
    category: "pad",
    description: "Pad analogico cinematografico caldo, lento e instabile.",
    keywords: ["pad", "cinematic", "blade", "warm", "caldo", "lento"],
    values: { wave: "Sawtooth", shape: -9, osc1: 212, osc2: 188, osc3: 105, noise: 20, cutoff: 118, resonance: 19, overdrive: 12, attack: 82, decay: 76, sustain: 108, release: 101, chorus: 69, delay: 22, reverb: 76, drift: 29 },
  },
  {
    id: "dark-reese",
    name: "Obsidian Reese",
    category: "bass",
    description: "Reese bass scuro con centro mono controllato.",
    keywords: ["reese", "bass", "basso", "dark", "scuro", "mono"],
    values: { wave: "Sawtooth", shape: -14, osc1: 255, osc2: 220, osc3: 96, noise: 6, cutoff: 83, resonance: 31, overdrive: 55, attack: 2, decay: 70, sustain: 112, release: 24, chorus: 18, delay: 0, reverb: 7, drift: 14 },
  },
  {
    id: "metallic-bell",
    name: "Alloy Bell",
    category: "bell",
    description: "Campana FM metallica con brillantezza sensibile alla velocity.",
    keywords: ["bell", "campana", "metal", "metallic", "fm", "velocity"],
    values: { wave: "Sine", shape: 0, osc1: 220, osc2: 128, osc3: 86, noise: 2, cutoff: 221, resonance: 49, overdrive: 5, attack: 0, decay: 89, sustain: 4, release: 74, chorus: 12, delay: 30, reverb: 58, drift: 2 },
  },
  {
    id: "wide-supersaw",
    name: "Skyline Saw",
    category: "lead",
    description: "Lead supersaw ampio e presente con movimento stereo.",
    keywords: ["supersaw", "lead", "wide", "ampio", "stereo", "saw"],
    values: { wave: "Sawtooth", shape: 22, osc1: 255, osc2: 232, osc3: 198, noise: 10, cutoff: 204, resonance: 28, overdrive: 26, attack: 5, decay: 58, sustain: 103, release: 46, chorus: 78, delay: 42, reverb: 37, drift: 11 },
  },
];

function control(
  parameterId: string,
  value: string | number | boolean,
  confidence: number,
  rationale: string,
) {
  return {
    parameterId,
    value,
    displayValue: String(value),
    confidence,
    rationale,
  };
}

export function buildDemoProposal(config: DemoConfig, targetSound?: string): SummitPatchProposal {
  const v = config.values;
  const proposal = {
    schemaVersion: "1.0.0" as const,
    proposalId: `demo-${config.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    patch: {
      name: config.name,
      mode: "single" as const,
      category: config.category,
      description: config.description,
      targetSound: targetSound || config.description,
    },
    analysis: {
      soundRole: config.category,
      synthesisHypothesis: `Sintesi sottrattiva con ${v.wave.toLowerCase()} e inviluppo calibrato per un carattere ${config.category}.`,
      oscillatorStrategy: "Oscillatore 1 dominante, oscillatori 2 e 3 dosati per corpo e densità.",
      filterStrategy: `Filtro passa-basso a 24 dB con cutoff ${v.cutoff} e risonanza ${v.resonance}.`,
      envelopeStrategy: `Amp envelope A ${v.attack}, D ${v.decay}, S ${v.sustain}, R ${v.release}.`,
      modulationStrategy: "Velocity sul filtro e modulazione lenta della forma per movimento controllato.",
      effectsStrategy: "Effetti dosati per profondità, preservando la leggibilità del centro.",
      overallConfidence: 0.68,
      assumptions: [
        "La proposta parte da un Init Patch e usa il firmware Summit 2.1.",
        "Il livello percepito dipende da velocity, ottava e catena di ascolto.",
      ],
      uncertainties: [
        "Il mock provider non analizza direttamente audio commerciale o mix completi.",
        "La taratura finale va eseguita all'ascolto sullo strumento reale.",
      ],
    },
    parts: [
      {
        part: "A" as const,
        panelControls: [
          control("osc1.range", config.category === "bass" ? "16'" : "8'", 0.88, "Registro coerente con il ruolo sonoro."),
          control("osc1.coarse", 0, 0.94, "Centro tonale non trasposto."),
          control("osc1.fine", config.category === "pad" ? -7 : 0, 0.76, "Micro-detune controllato."),
          control("osc1.wave", v.wave, 0.86, "Forma d'onda primaria dell'ipotesi timbrica."),
          control("osc1.shape", v.shape, 0.69, "Aggiusta il contenuto armonico della sorgente."),
          control("mixer.osc1.level", v.osc1, 0.9, "Sorgente principale."),
          control("mixer.osc2.level", v.osc2, 0.72, "Corpo e battimenti."),
          control("mixer.osc3.level", v.osc3, 0.64, "Densità secondaria."),
          control("mixer.noise.level", v.noise, 0.67, "Aria o attacco senza dominare il tono."),
          control("filter.shape", "LP", 0.85, "Strategia sottrattiva principale."),
          control("filter.slope", "24 dB", 0.81, "Controllo armonico deciso."),
          control("filter.frequency", v.cutoff, 0.74, "Bilanciamento di brillantezza."),
          control("filter.resonance", v.resonance, 0.71, "Definisce il bordo del filtro."),
          control("filter.overdrive", v.overdrive, 0.68, "Aggiunge densità pre-filtro."),
          control("amp.attack", v.attack, 0.82, "Profilo di ingresso del suono."),
          control("amp.decay", v.decay, 0.82, "Durata del corpo iniziale."),
          control("amp.sustain", v.sustain, 0.82, "Livello mantenuto."),
          control("amp.release", v.release, 0.8, "Coda dopo il rilascio."),
          control("fx.chorus.level", v.chorus, 0.66, "Movimento e larghezza."),
          control("fx.delay.level", v.delay, 0.62, "Profondità ritmica controllata."),
          control("fx.reverb.level", v.reverb, 0.65, "Ambiente proporzionato al ruolo."),
        ],
        menuSettings: [
          { ...control("osc.common.drift", v.drift, 0.68, "Instabilità analogica controllata."), menu: "Osc", page: 1 },
          { ...control("osc1.bendRange", 12, 0.77, "Escursione performativa standard di un'ottava."), menu: "Osc", page: 4 },
          { ...control("amp.delay", 0, 0.91, "L'inviluppo parte insieme alla nota."), menu: "Env", page: 2 },
        ],
        modulationMatrix: [
          { slot: 1, sourceA: "velocity", destination: "filter.frequency", depth: config.category === "bell" ? 38 : 18, rationale: "La dinamica apre il timbro senza cambiare la struttura della patch." },
          { slot: 2, sourceA: "lfo1.bipolar", destination: "osc1.shape", depth: config.category === "pad" ? 16 : 7, rationale: "Movimento timbrico lento e misurato." },
        ],
        fxModulationMatrix: [
          { slot: 1, sourceA: "lfo3.bipolar", destination: "fx.chorus.level", depth: config.category === "lead" ? 18 : 8, rationale: "Movimento stereo senza automatizzare parametri non verificati." },
        ],
      },
    ],
    setupInstructions: [
      { order: 1, area: "Oscillators", instruction: `Imposta Osc 1 su ${v.wave}, range ${config.category === "bass" ? "16'" : "8'"}.`, parameterIds: ["osc1.wave", "osc1.range"] },
      { order: 2, area: "Mixer", instruction: "Bilancia i tre oscillatori e aggiungi solo la quantità indicata di Noise.", parameterIds: ["mixer.osc1.level", "mixer.osc2.level", "mixer.osc3.level", "mixer.noise.level"] },
      { order: 3, area: "Filter", instruction: `Seleziona LP 24 dB; imposta Frequency ${v.cutoff} e Resonance ${v.resonance}.`, parameterIds: ["filter.shape", "filter.slope", "filter.frequency", "filter.resonance"] },
      { order: 4, area: "Amp Envelope", instruction: `Imposta A ${v.attack}, D ${v.decay}, S ${v.sustain}, R ${v.release}.`, parameterIds: ["amp.attack", "amp.decay", "amp.sustain", "amp.release"] },
      { order: 5, area: "Effects", instruction: "Aggiungi chorus, delay e reverb, poi confronta a volume compensato.", parameterIds: ["fx.chorus.level", "fx.delay.level", "fx.reverb.level"] },
    ],
    auditionGuide: {
      recommendedNotes: config.category === "bass" ? ["C1", "G1", "C2"] : ["C3", "E3", "G3", "C4"],
      recommendedVelocity: "Prova 50, 90 e 120",
      recommendedPlayingStyle: config.category === "pluck" ? "Note corte e accordi sincopati" : "Note singole e accordi sostenuti",
      whatToListenFor: ["Attacco", "equilibrio del centro", "coda degli effetti", "risposta alla velocity"],
    },
    refinements: [
      { problem: "Troppo brillante", suggestedChanges: [{ parameterId: "filter.frequency", operation: "decrease" as const, amount: 20 }] },
      { problem: "Attacco troppo lento", suggestedChanges: [{ parameterId: "amp.attack", operation: "decrease" as const, amount: 12 }] },
    ],
    alternatives: [
      { name: "Più scura", explanation: "Riduci il cutoff e il rumore.", changedParameterIds: ["filter.frequency", "mixer.noise.level"] },
      { name: "Più larga", explanation: "Aumenta chorus con cautela, controllando il centro.", changedParameterIds: ["fx.chorus.level"] },
    ],
  };
  return summitPatchProposalSchema.parse(proposal);
}

export function chooseDemo(description: string): DemoConfig {
  const normalized = description.toLowerCase();
  return (
    demoConfigs.find((demo) => demo.keywords.some((keyword) => normalized.includes(keyword))) ??
    demoConfigs[0]!
  );
}

export const demoProposals = demoConfigs.map((config) => buildDemoProposal(config));
