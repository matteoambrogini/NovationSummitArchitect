import { describe, expect, it } from "vitest";
import { parseReferenceUrl, parseTimestamp } from "./reference";

describe("reference parsing", () => {
  it("parses Spotify, YouTube and YouTube Music links", () => {
    expect(parseReferenceUrl("https://open.spotify.com/track/abc123")?.platform).toBe("spotify");
    expect(parseReferenceUrl("https://youtu.be/xyz987")?.resourceId).toBe("xyz987");
    expect(parseReferenceUrl("https://music.youtube.com/watch?v=track42")?.platform).toBe("youtube");
  });

  it("parses timestamps", () => {
    expect(parseTimestamp("01:14")).toBe(74);
    expect(parseTimestamp("1:02:03")).toBe(3723);
    expect(parseTimestamp("90")).toBe(90);
    expect(() => parseTimestamp("1:99")).toThrow(/inferiori a 60/);
  });

  it("rejects malformed supported links", () => {
    expect(() => parseReferenceUrl("https://open.spotify.com/artist/abc")).toThrow(/traccia/);
    expect(() => parseReferenceUrl("not a url")).toThrow(/URL/);
  });
});
