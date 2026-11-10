import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';

describe('ShopsService', () => {
  let prisma: any, audit: any, cloudinary: any, service: ShopsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    cloudinary = { uploadImage: jest.fn().mockResolvedValue('https://cdn/logo.png') };
    service = new ShopsService(prisma, cloudinary, audit);
  });

  it('refuse une 2e boutique pour le même commerçant (BR-BQT-02)', async () => {
    prisma.shop.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.createMine(1, { name: 'X' } as any)).rejects.toThrow(ConflictException);
    expect(prisma.shop.create).not.toHaveBeenCalled();
  });

  it('crée la boutique et téléverse le logo', async () => {
    prisma.shop.findUnique.mockResolvedValue(null);
    prisma.shop.create.mockImplementation(async ({ data }: any) => data);
    const res = await service.createMine(1, { name: 'X' } as any, Buffer.from('img'));
    expect(res.logoUrl).toBe('https://cdn/logo.png');
    expect(res.ownerId).toBe(1);
  });

  it('findMine : 404 sans boutique', async () => {
    prisma.shop.findUnique.mockResolvedValue(null);
    await expect(service.findMine(1)).rejects.toThrow(NotFoundException);
  });

  it('assertOwnedAndValidated : 403 tant que la boutique n’est pas VALIDEE (BR-PRD-01)', async () => {
    prisma.shop.findUnique.mockResolvedValue({ id: 1, status: 'EN_ATTENTE_VALIDATION' });
    await expect(service.assertOwnedAndValidated(1)).rejects.toThrow(ForbiddenException);
    prisma.shop.findUnique.mockResolvedValue({ id: 1, status: 'VALIDEE' });
    await expect(service.assertOwnedAndValidated(1)).resolves.toMatchObject({ id: 1 });
  });

  describe('updateStatus', () => {
    it('404 / statut identique', async () => {
      prisma.shop.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus(1, 'VALIDEE' as any, 9)).rejects.toThrow(NotFoundException);
      prisma.shop.findUnique.mockResolvedValue({ id: 1, status: 'VALIDEE' });
      await expect(service.updateStatus(1, 'VALIDEE' as any, 9)).rejects.toThrow(BadRequestException);
    });
    it('change le statut et journalise l’admin acteur', async () => {
      prisma.shop.findUnique.mockResolvedValue({ id: 1, status: 'EN_ATTENTE_VALIDATION' });
      prisma.shop.update.mockResolvedValue({ id: 1, status: 'VALIDEE' });
      await service.updateStatus(1, 'VALIDEE' as any, 9);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 9, action: 'SHOP_STATUS_CHANGE', previousValue: 'EN_ATTENTE_VALIDATION', newValue: 'VALIDEE',
      }));
    });
  });
});