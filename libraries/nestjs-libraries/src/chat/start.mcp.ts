import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { runWithContext } from './async.storage';
import { randomUUID } from 'crypto';

export const startMcp = (app: INestApplication) => {
  let mcpServer: any;
  let initPromise: Promise<any> | null = null;

  async function getServer() {
    if (mcpServer) return mcpServer;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const { MastraService } = await import(
        '@gitroom/nestjs-libraries/chat/mastra.service'
      );
      const { MCPServer } = await import('@mastra/mcp');

      const mastraService = app.get(MastraService, { strict: false });
      const mastra = await mastraService.mastra();
      const agent = mastra.getAgent('postiz');
      const tools = await agent.getTools();

      mcpServer = new MCPServer({
        name: 'Postiz MCP',
        version: '1.0.0',
        tools,
        agents: { postiz: agent },
      });

      return mcpServer;
    })();

    mcpServer = await initPromise;
    initPromise = null;
    return mcpServer;
  }

  const organizationService = app.get(OrganizationService, { strict: false });

  app.use(
    '/mcp',
    async (req: Request, res: Response, next: () => void) => {
      if (req.path !== '/' && req.path !== '') {
        next();
        return;
      }

      // @ts-ignore
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(401).send('Missing Authorization header');
        return;
      }

      // @ts-ignore
      req.auth = await organizationService.getOrgByApiKey(token);
      // @ts-ignore
      if (!req.auth) {
        res.status(401).send('Invalid API Key');
        return;
      }

      const server = await getServer();
      const url = new URL('/mcp', process.env.NEXT_PUBLIC_BACKEND_URL);

      // @ts-ignore
      await runWithContext({ requestId: token, auth: req.auth }, async () => {
        await server.startHTTP({
          url,
          httpPath: url.pathname,
          options: {
            sessionIdGenerator: () => {
              return randomUUID();
            },
          },
          req,
          res,
        });
      });
    }
  );

  app.use(
    '/mcp/:id',
    async (req: Request, res: Response) => {
      // @ts-ignore
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }

      // @ts-ignore
      req.auth = await organizationService.getOrgByApiKey(req.params.id);
      // @ts-ignore
      if (!req.auth) {
        res.status(400).send('Invalid API Key');
        return;
      }

      const server = await getServer();
      const url = new URL(
        `/mcp/${req.params.id}`,
        process.env.NEXT_PUBLIC_BACKEND_URL
      );

      await runWithContext(
        // @ts-ignore
        { requestId: req.params.id, auth: req.auth },
        async () => {
          await server.startHTTP({
            url,
            httpPath: url.pathname,
            options: {
              sessionIdGenerator: () => {
                return randomUUID();
              },
            },
            req,
            res,
          });
        }
      );
    }
  );
};
