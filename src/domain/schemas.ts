import { z } from "zod";

export const firmwareVersionSchema = z.string().regex(/^\d+\.\d+(?:\.\d+)?$/);

const firmwareApplicabilitySchema = z.object({
  introducedInFirmware: firmwareVersionSchema.optional(),
  removedInFirmware: firmwareVersionSchema.optional(),
  firmwareNote: z.string().min(1).optional(),
});

export const verificationStatusSchema = z.enum([
  "verified",
  "unverified",
  "conflict",
  "unknown",
  "deprecated",
]);

export const summitCatalogTargetSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  product: z.literal("Novation Summit"),
  primaryFirmware: firmwareVersionSchema,
  supportedFirmware: z.object({
    minimum: firmwareVersionSchema,
    target: firmwareVersionSchema,
  }),
  coveragePolicy: z.object({
    metric: z.literal("ai-usable"),
    midiExcluded: z.literal(true),
    thresholds: z.object({
      oscillators: z.number().min(0).max(100),
      fm: z.number().min(0).max(100),
      mixer: z.number().min(0).max(100),
      filter: z.number().min(0).max(100),
      envelopes: z.number().min(0).max(100),
      lfo: z.number().min(0).max(100),
      voice: z.number().min(0).max(100),
      reverb: z.number().min(0).max(100),
      delay: z.number().min(0).max(100),
      chorus: z.number().min(0).max(100),
      mod: z.number().min(0).max(100),
      fxMod: z.number().min(0).max(100),
      multi: z.number().min(0).max(100),
    }),
    documentedExceptions: z.record(
      z.string().min(1),
      z.object({
        residualIds: z.array(z.string().min(1)).min(1),
        reason: z.string().min(1),
      }),
    ),
  }),
  verifiedAt: z.iso.date(),
});

const documentationSchema = z.object({
  document: z.string().min(1),
  section: z.string().min(1),
  page: z.number().int().positive().optional(),
  locator: z.string().min(1).optional(),
  sourceUrl: z.url().optional(),
  verifiedAt: z.iso.date(),
  verification: z
    .object({
      document: z.string().min(1),
      section: z.string().min(1),
      page: z.number().int().positive().optional(),
      locator: z.string().min(1).optional(),
      sourceUrl: z.url(),
      verifiedAt: z.iso.date(),
      note: z.string().min(1).optional(),
    })
    .optional(),
});

const panelLocationSchema = z
  .object({
    type: z.literal("panel"),
    controlId: z.string().min(1),
  })
  .extend(firmwareApplicabilitySchema.shape);

const menuLocationSchema = z
  .object({
    type: z.literal("menu"),
    menu: z.string().min(1),
    page: z.union([z.number().int().positive(), z.string().min(1)]),
    row: z.number().int().min(1).max(4).optional(),
  })
  .extend(firmwareApplicabilitySchema.shape);

const parameterLocationSchema = z.discriminatedUnion("type", [
  panelLocationSchema,
  menuLocationSchema,
]);

export const summitParameterDefinitionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    physicalLabel: z.string().min(1).optional(),
    shortDisplayLabel: z.string().min(1).optional(),
    section: z.string().min(1),
    subsection: z.string().min(1).optional(),
    location: parameterLocationSchema,
    alternateLocations: z.array(parameterLocationSchema).optional(),
    scope: z.enum(["part", "multi", "global"]),
    partApplicability: z.enum(["A", "B", "both"]).optional(),
    singleMultiApplicability: z.enum(["single", "multi", "both"]),
    valueType: z.enum([
      "integer",
      "decimal",
      "boolean",
      "enum",
      "bipolar",
      "note",
      "frequency",
      "time",
      "unknown",
    ]),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    step: z.number().positive().optional(),
    unit: z.string().optional(),
    enumValues: z.array(z.string()).min(1).optional(),
    aiEnumValues: z.array(z.string()).min(1).optional(),
    aiStableEnumValueCount: z.number().int().positive().optional(),
    enumValueFirmware: z.record(z.string().min(1), firmwareApplicabilitySchema).optional(),
    defaultValue: z.unknown().optional(),
    dependencies: z.array(z.object({ parameterId: z.string(), condition: z.string() })).optional(),
    description: z.string().min(1),
    sonicEffect: z.string().min(1),
    documentation: documentationSchema,
    verificationStatus: verificationStatusSchema,
    verificationNote: z.string().min(1).optional(),
    attributeConflicts: z
      .array(
        z.object({
          field: z.string().min(1),
          values: z
            .array(
              z.object({
                source: z.string().min(1),
                value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
              }),
            )
            .min(2),
          impact: z.string().min(1),
        }),
      )
      .optional(),
    aiExposed: z.boolean(),
    ...firmwareApplicabilitySchema.shape,
  })
  .superRefine((definition, context) => {
    if (
      definition.valueType === "enum" &&
      (!definition.enumValues || definition.enumValues.length === 0)
    ) {
      context.addIssue({ code: "custom", message: "Un parametro enum richiede enumValues" });
    }
    if (definition.aiEnumValues?.some((value) => !definition.enumValues?.includes(value))) {
      context.addIssue({
        code: "custom",
        message: "aiEnumValues deve essere un sottoinsieme di enumValues",
      });
    }
    if (
      definition.aiStableEnumValueCount !== undefined &&
      (!definition.enumValues || definition.aiStableEnumValueCount > definition.enumValues.length)
    ) {
      context.addIssue({
        code: "custom",
        message: "aiStableEnumValueCount eccede enumValues",
      });
    }
    if (
      ["integer", "decimal", "bipolar", "frequency", "time"].includes(definition.valueType) &&
      (definition.minimum === undefined || definition.maximum === undefined) &&
      definition.verificationStatus === "verified"
    ) {
      context.addIssue({ code: "custom", message: "Il parametro numerico richiede min e max" });
    }
    if (definition.aiExposed && definition.verificationStatus !== "verified") {
      context.addIssue({
        code: "custom",
        message: "Solo i parametri verified possono essere esposti al provider AI",
      });
    }
    if (definition.verificationStatus === "verified" && !definition.documentation.verification) {
      context.addIssue({
        code: "custom",
        message: "Un parametro verified richiede una verifica indipendente",
      });
    }
  });

export const summitParameterCatalogSchema = z.array(summitParameterDefinitionSchema);

const parameterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const panelControlSettingSchema = z.object({
  parameterId: z.string().min(1),
  value: parameterValueSchema,
  normalizedValue: z.number().min(0).max(1).optional(),
  displayValue: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
});

const menuSettingSchema = panelControlSettingSchema.omit({ normalizedValue: true }).extend({
  menu: z.string().min(1),
  page: z.union([z.number().int().positive(), z.string().min(1)]),
});

const modulationAssignmentSchema = z.object({
  slot: z.number().int().positive(),
  sourceA: z.string().min(1),
  sourceB: z.string().min(1).optional(),
  destination: z.string().min(1),
  depth: z.number().int().min(-64).max(63),
  rationale: z.string().min(1),
});

export const summitPatchProposalSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    proposalId: z.string().min(1),
    createdAt: z.iso.datetime(),
    targetFirmware: firmwareVersionSchema.optional(),
    patch: z.object({
      name: z.string().min(1).max(16),
      mode: z.enum(["single", "multi"]),
      category: z.enum(["bass", "lead", "pad", "pluck", "keys", "bell", "fx", "sequence", "other"]),
      description: z.string().min(1),
      targetSound: z.string().min(1),
    }),
    analysis: z.object({
      soundRole: z.string().optional(),
      synthesisHypothesis: z.string(),
      oscillatorStrategy: z.string(),
      filterStrategy: z.string(),
      envelopeStrategy: z.string(),
      modulationStrategy: z.string(),
      effectsStrategy: z.string(),
      overallConfidence: z.number().min(0).max(1),
      assumptions: z.array(z.string()),
      uncertainties: z.array(z.string()),
    }),
    parts: z
      .array(
        z.object({
          part: z.enum(["A", "B"]),
          panelControls: z.array(panelControlSettingSchema),
          menuSettings: z.array(menuSettingSchema),
          modulationMatrix: z.array(modulationAssignmentSchema),
          fxModulationMatrix: z.array(modulationAssignmentSchema),
        }),
      )
      .min(1)
      .max(2),
    multiSetup: z
      .object({
        panelControls: z.array(panelControlSettingSchema),
        menuSettings: z.array(menuSettingSchema),
      })
      .optional(),
    setupInstructions: z.array(
      z.object({
        order: z.number().int().positive(),
        area: z.string(),
        instruction: z.string(),
        parameterIds: z.array(z.string()),
      }),
    ),
    auditionGuide: z.object({
      recommendedNotes: z.array(z.string()),
      recommendedVelocity: z.string().optional(),
      recommendedPlayingStyle: z.string(),
      whatToListenFor: z.array(z.string()),
    }),
    refinements: z.array(
      z.object({
        problem: z.string(),
        suggestedChanges: z.array(
          z.object({
            parameterId: z.string(),
            operation: z.enum(["set", "increase", "decrease"]),
            value: parameterValueSchema.optional(),
            amount: z.number().optional(),
          }),
        ),
      }),
    ),
    alternatives: z.array(
      z.object({
        name: z.string(),
        explanation: z.string(),
        changedParameterIds: z.array(z.string()),
      }),
    ),
  })
  .superRefine((proposal, context) => {
    if (proposal.multiSetup && proposal.patch.mode !== "multi") {
      context.addIssue({
        code: "custom",
        path: ["multiSetup"],
        message: "multiSetup è consentito soltanto per una patch Multi",
      });
    }
  });

export const summitPatchDeltaSchema = z.object({
  baseProposalId: z.string(),
  userInstruction: z.string().min(1),
  changes: z.array(
    z.object({
      parameterId: z.string(),
      previousValue: parameterValueSchema,
      newValue: parameterValueSchema,
      rationale: z.string(),
    }),
  ),
  unchangedStrategy: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const audioFeatureSummarySchema = z.object({
  durationSeconds: z.number().nonnegative(),
  analysisRegion: z.object({ startSeconds: z.number(), endSeconds: z.number() }),
  pitch: z
    .object({
      medianHz: z.number().optional(),
      confidence: z.number(),
      stability: z.number().optional(),
    })
    .optional(),
  envelope: z.object({
    attackMs: z.number().optional(),
    decayMs: z.number().optional(),
    sustainEstimate: z.number().optional(),
    releaseMs: z.number().optional(),
    transientStrength: z.number().optional(),
  }),
  spectrum: z.object({
    centroidHz: z.number().optional(),
    rolloffHz: z.number().optional(),
    flatness: z.number().optional(),
    harmonicity: z.number().optional(),
  }),
  modulation: z
    .object({
      amplitudeRateHz: z.number().optional(),
      pitchRateHz: z.number().optional(),
      confidence: z.number(),
    })
    .optional(),
  stereo: z.object({
    width: z.number().optional(),
    correlation: z.number().optional(),
    lowBandCorrelation: z.number().optional(),
  }),
  warnings: z.array(z.string()),
});

export const summitProjectFileSchema = z.object({
  fileFormat: z.literal("summit-patch-architect-project"),
  version: z.literal("1.0.0"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  input: z.object({
    description: z.string(),
    reference: z
      .object({
        platform: z.enum(["spotify", "youtube", "other"]),
        url: z.url(),
        title: z.string().optional(),
        artist: z.string().optional(),
        timestampSeconds: z.number().nonnegative().optional(),
        targetSound: z.string().optional(),
      })
      .optional(),
    audioFileReference: z
      .object({
        originalName: z.string(),
        localManagedCopy: z.string().optional(),
        sha256: z.string().optional(),
      })
      .optional(),
  }),
  proposals: z.array(summitPatchProposalSchema),
  activeProposalId: z.string(),
});

export type SummitParameterDefinition = z.infer<typeof summitParameterDefinitionSchema>;
export type SummitCatalogTarget = z.infer<typeof summitCatalogTargetSchema>;
export type SummitPatchProposal = z.infer<typeof summitPatchProposalSchema>;
export type SummitPatchDelta = z.infer<typeof summitPatchDeltaSchema>;
export type SummitProjectFile = z.infer<typeof summitProjectFileSchema>;
export type AudioFeatureSummary = z.infer<typeof audioFeatureSummarySchema>;
