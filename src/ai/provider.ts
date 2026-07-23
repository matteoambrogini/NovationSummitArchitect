import type { AudioFeatureSummary, SummitPatchDelta, SummitPatchProposal } from "../domain/schemas";

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

export interface PatchProvider {
  readonly id: string;
  readonly displayName: string;
  readonly requiresCredentials: boolean;
  generate(request: PatchGenerationRequest): Promise<SummitPatchProposal>;
  refine(proposal: SummitPatchProposal, instruction: string): Promise<SummitPatchDelta>;
}
