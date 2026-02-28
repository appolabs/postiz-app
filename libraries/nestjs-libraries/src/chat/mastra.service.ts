import { Injectable } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';

@Injectable()
export class MastraService {
  private static _mastra: any;
  constructor(private _loadToolsService: LoadToolsService) {}
  async mastra() {
    if (!MastraService._mastra) {
      const [{ Mastra }, { ConsoleLogger }, { getPStore }] = await Promise.all([
        import('@mastra/core/mastra'),
        import('@mastra/core/logger'),
        import('@gitroom/nestjs-libraries/chat/mastra.store'),
      ]);

      MastraService._mastra = new Mastra({
        storage: getPStore(),
        agents: {
          postiz: await this._loadToolsService.agent(),
        },
        logger: new ConsoleLogger({
          level: 'info',
        }),
      });
    }

    return MastraService._mastra;
  }
}
