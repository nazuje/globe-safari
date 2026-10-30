/** Photo lookups from the Wikipedia REST API, remembered for the whole visit. */

const SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const TIMEOUT_MS = 8000;

interface WikiSummary {
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

function pickImage(summary: WikiSummary): string | null {
  return summary.thumbnail?.source ?? summary.originalimage?.source ?? null;
}

async function fetchPhoto(wikiTitle: string, fetcher: Fetcher): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(SUMMARY_URL + encodeURIComponent(wikiTitle), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return pickImage((await response.json()) as WikiSummary);
  } catch {
    return null; // offline, blocked or slow: the caller shows an emoji instead
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Creates a photo finder with its own memory. Each title is fetched at most
 * once; failures resolve to null so the caller can fall back to an emoji.
 */
export function createPhotoFinder(fetcher: Fetcher = (url, init) => fetch(url, init)) {
  const cache = new Map<string, Promise<string | null>>();
  return (wikiTitle: string): Promise<string | null> => {
    let pending = cache.get(wikiTitle);
    if (!pending) {
      pending = fetchPhoto(wikiTitle, fetcher);
      cache.set(wikiTitle, pending);
    }
    return pending;
  };
}

export const findPhoto = createPhotoFinder();
