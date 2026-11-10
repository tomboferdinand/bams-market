import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('db-test')
    async testDatabase() {
        const users = await this.prisma.user.findMany();

        return {
            success: true,
            database: 'connected',
            users,
        };
    }
}