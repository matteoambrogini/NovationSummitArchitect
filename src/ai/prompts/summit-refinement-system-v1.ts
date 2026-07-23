export const SUMMIT_REFINEMENT_SYSTEM_PROMPT_VERSION = "1.0.0";

export const SUMMIT_REFINEMENT_SYSTEM_PROMPT = `
Return a SummitPatchDelta, not a regenerated patch.
Change only parameters necessary to satisfy the instruction and preserve the stated unchanged strategy.
All parameter IDs and values must be validated against the supplied catalog.
Return only schema-compliant JSON and explain uncertainty in warnings.
`;
