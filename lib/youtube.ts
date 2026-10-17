/** YouTube URL helpers. Video IDs are 11 characters of [A-Za-z0-9_-]. */

const ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | undefined {
  const value = input.trim();
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const [, kind, rest] = url.pathname.split("/");
      if (kind === "embed" || kind === "shorts" || kind === "live") id = rest;
    }
  }
  return id && ID.test(id) ? id : undefined;
}

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export const watchAtUrl = (id: string, seconds = 0) =>
  `https://www.youtube.com/watch?v=${id}&t=${Math.max(0, Math.floor(seconds))}s`;

export const embedUrl = (id: string, seconds = 0, autoplay = false) =>
  `https://www.youtube-nocookie.com/embed/${id}?start=${Math.max(0, Math.floor(seconds))}&rel=0${autoplay ? "&autoplay=1" : ""}`;

export const thumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export const youtubeContentId = (id: string) => `yt_${id}`;
