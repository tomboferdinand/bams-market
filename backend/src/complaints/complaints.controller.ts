import { Controller, Get } from '@nestjs/common'; import { ComplaintsService } from './complaints.service';
@Controller('complaints') export class ComplaintsController { constructor(private readonly service: ComplaintsService) {} @Get() findAll() { return this.service.findAll(); } }
