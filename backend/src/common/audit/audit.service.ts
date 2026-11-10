import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEntry {
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  previousValue?: string;
  newValue?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(entry: AuditEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }

  findAll(entityType?: string, limit = 200) {
    return this.prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      include: { actor: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}