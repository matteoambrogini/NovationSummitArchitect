export type ParsedReference = {
  platform: "spotify" | "youtube" | "other";
  originalUrl: string;
  resourceId?: string;
};

export function parseReferenceUrl(input: string): ParsedReference | undefined {
  if (!input.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Inserisci un URL Spotify o YouTube valido");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "open.spotify.com") {
    const match = url.pathname.match(/^\/(track|episode)\/([A-Za-z0-9]+)/);
    if (!match) throw new Error("Il link Spotify non identifica una traccia o un episodio");
    return { platform: "spotify", originalUrl: url.toString(), resourceId: match[2]! };
  }
  if (["youtube.com", "music.youtube.com", "m.youtube.com"].includes(host)) {
    const id = url.searchParams.get("v") ?? url.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (!id) throw new Error("Il link YouTube non contiene un video identificabile");
    return { platform: "youtube", originalUrl: url.toString(), resourceId: id };
  }
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) throw new Error("Il link breve YouTube non è completo");
    return { platform: "youtube", originalUrl: url.toString(), resourceId: id };
  }
  return { platform: "other", originalUrl: url.toString() };
}

export function parseTimestamp(input: string): number | undefined {
  if (!input.trim()) return undefined;
  if (/^\d+$/.test(input.trim())) return Number(input.trim());
  const parts = input.trim().split(":").map(Number);
  if (parts.some(Number.isNaN) || parts.length < 2 || parts.length > 3) {
    throw new Error("Usa un timestamp come 01:14 o 1:02:30");
  }
  if (parts.some((value, index) => index > 0 && value >= 60)) {
    throw new Error("Minuti e secondi devono essere inferiori a 60");
  }
  return parts.reduce((total, value) => total * 60 + value, 0);
}
