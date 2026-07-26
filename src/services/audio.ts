const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
]);

const SUPPORTED_EXTENSIONS = new Set(["wav", "aif", "aiff", "mp3", "m4a", "flac"]);
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const RECOMMENDED_MAX_DURATION_SECONDS = 30;

export function validateAudioFile(file: Pick<File, "name" | "size" | "type">): string[] {
  const warnings: string[] = [];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_EXTENSIONS.has(extension) || (file.type && !SUPPORTED_AUDIO_TYPES.has(file.type))) {
    throw new Error("Formato non supportato. Usa WAV, AIFF, MP3, M4A o FLAC.");
  }
  if (file.size > MAX_AUDIO_BYTES) throw new Error("Il file supera il limite di 50 MB.");
  if (extension === "flac") warnings.push("La decodifica FLAC dipende dal supporto del sistema.");
  return warnings;
}
