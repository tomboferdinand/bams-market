import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/** Route de santé pour l'hébergeur : indique seulement que le serveur répond, sans aucune donnée. */
@ApiExcludeController()
@Controller()
export class AppController {
    @Get('health')
    health() {
        return { status: 'ok' };
    }
}
