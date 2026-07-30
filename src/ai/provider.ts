import type { AiGeneration, ProviderMetadata } from "./contract";
import type { AudioFeatureSummary, SummitPatchProposal } from "../domain/schemas";

export type AnalysisMode = "text" | "reference" | "audio-assisted";

export type PatchGenerationRequest = {
  description: string;
  targetSound?: string;
  reference?: {
    platform: "spotify" | "youtube" | "other";
    url: string;
    timestampSeconds?: number;
  };
  audioFeatures?: AudioFeatureSummary;
  mode: AnalysisMode;
};

export type GenerationInsight = {
  provider: string;
  summary: string;
  soundAnalysis?: AiGeneration["soundAnalysis"];
  sectionConfidence: AiGeneration["sectionConfidence"];
  assumptions: string[];
  warnings: string[];
  metadata?: ProviderMetadata;
  repaired: boolean;
  partial: boolean;
};

export type PatchGenerationResult = {
  proposal: SummitPatchProposal;
  insight: GenerationInsight;
};

export interface PatchProvider {
  readonly id: string;
  readonly displayName: string;
  readonly requiresCredentials: boolean;
  generate(request: PatchGenerationRequest): Promise<PatchGenerationResult>;
  refine(proposal: SummitPatchProposal, instruction: string): Promise<PatchGenerationResult>;
}
