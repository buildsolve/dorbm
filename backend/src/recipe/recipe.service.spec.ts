import { Test, TestingModule } from '@nestjs/testing';
import { RecipeService } from './recipe.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  recipe: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recipeComponent: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  recipeVersion: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  product: { count: jest.fn() },
  $transaction: jest.fn(fn => fn(mockPrisma)),
};

describe('RecipeService', () => {
  let service: RecipeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<RecipeService>(RecipeService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns active recipes with material cost', async () => {
      const recipes = [{
        id: '1', name: 'Vanilla Cake', isActive: true, laborCost: 5, overheadCost: 2, yield: 1,
        components: [
          { quantity: 0.5, ingredient: { id: 'i1', name: 'Flour', unit: 'KG', unitCost: 1.2 } },
        ],
        _count: { products: 0 },
      }];
      mockPrisma.recipe.findMany.mockResolvedValue(recipes);
      const result = await service.findAll();
      expect(result[0].totalMaterialCost).toBeCloseTo(0.6);
    });
  });

  describe('create', () => {
    it('throws ConflictException if code exists', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.create({ code: 'RCP001', name: 'Test', yield: 1 })).rejects.toThrow(ConflictException);
    });
  });

  describe('calculateCost', () => {
    it('returns full cost breakdown', async () => {
      const recipe = {
        id: '1', name: 'Test', laborCost: 5, overheadCost: 2, yield: 1,
        components: [{ quantity: 0.5, ingredient: { unitCost: 1.2 } }],
        products: [], recipeVersions: [],
      };
      mockPrisma.recipe.findUnique.mockResolvedValue(recipe);
      const cost = await service.calculateCost('1');
      expect(cost.materialCost).toBeCloseTo(0.6);
      expect(cost.totalCost).toBeCloseTo(7.6);
      expect(cost.costPerUnit).toBeCloseTo(7.6);
    });
  });
});
