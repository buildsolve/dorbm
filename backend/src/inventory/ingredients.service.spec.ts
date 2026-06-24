import { Test, TestingModule } from '@nestjs/testing';
import { IngredientsService } from './ingredients.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  ingredient: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    fields: { reorderLevel: {} },
  },
  recipeComponent: {
    count: jest.fn(),
  },
  stockTransaction: { findMany: jest.fn() },
};

describe('IngredientsService', () => {
  let service: IngredientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<IngredientsService>(IngredientsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns active ingredients by default', async () => {
      const ingredients = [{ id: '1', name: 'Flour', isActive: true }];
      mockPrisma.ingredient.findMany.mockResolvedValue(ingredients);
      const result = await service.findAll();
      expect(result).toEqual(ingredients);
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } })
      );
    });

    it('returns all ingredients when includeInactive=true', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([]);
      await service.findAll(true);
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('findOne', () => {
    it('returns ingredient by id', async () => {
      const ingredient = { id: '1', name: 'Flour', stockTransactions: [] };
      mockPrisma.ingredient.findUnique.mockResolvedValue(ingredient);
      const result = await service.findOne('1');
      expect(result).toEqual(ingredient);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.ingredient.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a new ingredient', async () => {
      const dto = { code: 'ING001', name: 'Flour', unit: 'KG', unitCost: 1.2 };
      mockPrisma.ingredient.findUnique.mockResolvedValue(null);
      mockPrisma.ingredient.create.mockResolvedValue({ id: '1', ...dto });
      const result = await service.create(dto);
      expect(result.id).toBe('1');
    });

    it('throws ConflictException if code exists', async () => {
      mockPrisma.ingredient.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.create({ code: 'ING001' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft deletes if used in recipes', async () => {
      const ingredient = { id: '1', name: 'Flour', stockTransactions: [] };
      mockPrisma.ingredient.findUnique.mockResolvedValue(ingredient);
      mockPrisma.recipeComponent.count.mockResolvedValue(2);
      mockPrisma.ingredient.update.mockResolvedValue({ ...ingredient, isActive: false });
      await service.remove('1');
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } })
      );
    });

    it('hard deletes if not in recipes', async () => {
      const ingredient = { id: '1', name: 'Flour', stockTransactions: [] };
      mockPrisma.ingredient.findUnique.mockResolvedValue(ingredient);
      mockPrisma.recipeComponent.count.mockResolvedValue(0);
      mockPrisma.ingredient.delete.mockResolvedValue(ingredient);
      await service.remove('1');
      expect(mockPrisma.ingredient.delete).toHaveBeenCalled();
    });
  });
});
