import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES, validateAudioFile } from "./audio";

describe("audio input validation", () => {
  it("accepts supported audio and warns on FLAC", () => {
    expect(validateAudioFile({ name: "clip.wav", size: 1000, type: "audio/wav" })).toEqual([]);
    expect(validateAudioFile({ name: "clip.flac", size: 1000, type: "audio/flac" })[0]).toMatch(/sistema/);
  });

  it("rejects unsupported and oversized files", () => {
    expect(() => validateAudioFile({ name: "clip.exe", size: 1, type: "application/octet-stream" })).toThrow(/Formato/);
    expect(() => validateAudioFile({ name: "clip.wav", size: MAX_AUDIO_BYTES + 1, type: "audio/wav" })).toThrow(/50 MB/);
  });
});
