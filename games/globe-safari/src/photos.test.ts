import { describe, expect, it, vi } from 'vitest';
import { createPhotoFinder } from './photos.ts';

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

describe('createPhotoFinder', () => {
  it('returns the thumbnail and asks Wikipedia only once per title', async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ thumbnail: { source: 'https://img/jaguar.jpg' } }),
    );
    const find = createPhotoFinder(fetcher);

    expect(await find('Jaguar')).toBe('https://img/jaguar.jpg');
    expect(await find('Jaguar')).toBe('https://img/jaguar.jpg');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toEqual([
      'https://en.wikipedia.org/api/rest_v1/page/summary/Jaguar',
      expect.anything(),
    ]);
  });

  it('encodes titles with accents and apostrophes', async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({}));
    await createPhotoFinder(fetcher)("Darwin's_rhea");
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://en.wikipedia.org/api/rest_v1/page/summary/Darwin\'s_rhea',
    );
  });

  it('falls back to the original image, then to null', async () => {
    const original = createPhotoFinder(async () => jsonResponse({ originalimage: { source: 'big.jpg' } }));
    expect(await original('A')).toBe('big.jpg');

    const none = createPhotoFinder(async () => jsonResponse({}));
    expect(await none('B')).toBeNull();
  });

  it('resolves to null when the request fails', async () => {
    const notFound = createPhotoFinder(async () => jsonResponse({}, false));
    expect(await notFound('Nope')).toBeNull();

    const offline = createPhotoFinder(async () => {
      throw new TypeError('offline');
    });
    expect(await offline('Nope')).toBeNull();
  });
});
