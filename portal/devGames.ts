import { fileURLToPath } from 'node:url';
import { createServer, type Connect, type Plugin } from 'vite';
import registry from '../games.json' with { type: 'json' };

const GAMES_DIR = fileURLToPath(new URL('../games/', import.meta.url));

/**
 * Dev only: serves each ready game at /<slug>/ from the portal's own server, so
 * tile links work just as they do on the deployed site.
 */
export function devGames(): Plugin {
  return {
    name: 'playroom-dev-games',
    apply: (_config, { command, mode }) => command === 'serve' && mode !== 'test',
    async configureServer(server) {
      const { httpServer } = server;
      if (!httpServer) return;
      for (const { slug, status } of registry) {
        if (status !== 'ready') continue;
        const game = await createServer({
          root: GAMES_DIR + slug,
          base: `/${slug}/`,
          server: { middlewareMode: true, hmr: { server: httpServer } },
        });
        server.middlewares.use(forwardTo(`/${slug}`, game.middlewares));
        httpServer.on('close', () => void game.close());
      }
    },
  };
}

function forwardTo(prefix: string, target: Connect.Server): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.url?.startsWith(`${prefix}/`)) target(req, res, next);
    else if (req.url === prefix) res.writeHead(302, { Location: `${prefix}/` }).end();
    else next();
  };
}
