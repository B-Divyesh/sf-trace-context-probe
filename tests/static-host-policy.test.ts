import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const configUrl = new URL('../site/public/staticwebapp.config.json', import.meta.url);

type StaticWebAppConfig = {
  globalHeaders: Record<string, string>;
  routes: Array<{ route: string; headers?: Record<string, string> }>;
};

async function readStaticHostPolicy(): Promise<StaticWebAppConfig> {
  return JSON.parse(await readFile(fileURLToPath(configUrl), 'utf8')) as StaticWebAppConfig;
}

describe('Azure Static Web Apps response policy', () => {
  it('ships the authored security and cache headers instead of host defaults', async () => {
    const config = await readStaticHostPolicy();

    expect(config.globalHeaders).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });

    const routeHeaders = new Map(config.routes.map(({ route, headers }) => [route, headers]));
    expect(routeHeaders.get('/assets/*')).toEqual({
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    expect(routeHeaders.get('/hero-diorama.webp')).toEqual({
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    expect(routeHeaders.get('/sw.js')).toEqual({ 'Cache-Control': 'no-cache' });
  });
});
