import { z } from "zod";

const confidenceSchema = z.number().min(0).max(1);
const parameterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const aiGenerationSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    patchName: z.string().min(1).max(16),
    category: z.enum(["bass", "lead", "pad", "pluck", "keys", "bell", "fx", "sequence", "other"]),
    description: z.string().min(1),
    soundAnalysis: z.object({
      role: z.string().min(1),
      brightness: confidenceSchema,
      movement: confidenceSchema,
      width: confidenceSchema,
      attackCharacter: z.string().min(1),
      sustainCharacter: z.string().min(1),
      transientCharacter: z.string().min(1),
      harmonicCharacter: z.string().min(1),
      spatialCharacter: z.string().min(1),
    }),
    settings: z.array(
      z.object({
        parameterId: z.string().min(1),
        value: parameterValueSchema,
        rationale: z.string().min(1),
        confidence: confidenceSchema,
      }),
    ),
    modulationSlots: z.array(
      z.object({
        slot: z.number().int().positive(),
        sourceA: z.string().min(1),
        sourceB: z.string().min(1),
        destination: z.string().min(1),
        depth: z.number().int(),
        rationale: z.string().min(1),
        confidence: confidenceSchema,
      }),
    ),
    fxModulationSlots: z.array(
      z.object({
        slot: z.number().int().positive(),
        sourceA: z.string().min(1),
        sourceB: z.string().min(1),
        destination: z.string().min(1),
        depth: z.number().int(),
        rationale: z.string().min(1),
        confidence: confidenceSchema,
      }),
    ),
    sectionConfidence: z.array(
      z.object({
        section: z.enum([
          "oscillators",
          "mixer",
          "filter",
          "envelopes",
          "lfo",
          "voice",
          "modulation",
          "effects",
          "performance",
        ]),
        confidence: confidenceSchema,
        reason: z.string().min(1),
      }),
    ),
    assumptions: z.array(z.string().min(1)),
    warnings: z.array(z.string().min(1)),
    summary: z.string().min(1),
  })
  .strict();

const tokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const tauriGenerationResponseSchema = z.object({
  generation: z.unknown(),
  metadata: z.object({
    requestId: z.string().min(1),
    model: z.string().min(1),
    durationMilliseconds: z.number().int().nonnegative(),
    usage: tokenUsageSchema.optional(),
  }),
});

export const openAiErrorCodeSchema = z.enum([
  "missing_api_key",
  "invalid_request",
  "authentication",
  "permission_denied",
  "rate_limit",
  "credit_balance_exhausted",
  "organization_spend_limit_exceeded",
  "project_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
  "insufficient_quota",
  "model_unavailable",
  "network_failure",
  "timeout",
  "refusal",
  "incomplete_response",
  "malformed_structured_output",
  "provider_unavailable",
]);

export const openAiApplicationErrorSchema = z.object({
  code: openAiErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  status: z.number().int().optional(),
});

export type AiGeneration = z.infer<typeof aiGenerationSchema>;
export type ProviderMetadata = z.infer<typeof tauriGenerationResponseSchema>["metadata"];
export type OpenAiErrorCode = z.infer<typeof openAiErrorCodeSchema>;
