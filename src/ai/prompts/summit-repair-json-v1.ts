export const SUMMIT_REPAIR_JSON_PROMPT_VERSION = "1.0.0";

export const SUMMIT_REPAIR_JSON_PROMPT = `
Repair the candidate JSON to match the supplied schema and catalogs.
Remove unsupported fields and parameters rather than inventing replacements.
Keep valid values unchanged. Return JSON only.
`;
