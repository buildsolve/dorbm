export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PRODUCTION' | 'INVENTORY' | 'FINANCE';
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  unitCost: number;
  reorderLevel: number;
  currentStock: number;
  storageLocation?: string;
  allergenInfo?: string;
  supplierId?: string;
  supplier?: Supplier;
  isActive: boolean;
}

export interface RecipeComponent {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  notes?: string;
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  description?: string;
  yield: number;
  yieldUnit: string;
  laborCost: number;
  overheadCost: number;
  version: number;
  isActive: boolean;
  components: RecipeComponent[];
  totalMaterialCost?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  recipeId?: string;
  sellingPrice: number;
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  allergenInfo?: string;
  shelfLifeDays?: number;
  isActive: boolean;
  category?: ProductCategory;
  recipe?: Recipe;
  materialCost?: number;
  totalCost?: number;
  contributionMargin?: number;
  marginPercent?: number;
}

export interface ProductionPlan {
  id: string;
  planDate: string;
  weekNumber?: number;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  lines: ProductionPlanLine[];
}

export interface ProductionPlanLine {
  id: string;
  planId: string;
  productId: string;
  product: Product;
  plannedQuantity: number;
  actualQuantity?: number;
  notes?: string;
}

export interface ProductionBatch {
  id: string;
  planId?: string;
  productId?: string;
  batchNumber: string;
  plannedQty: number;
  actualQty?: number;
  wastageQty?: number;
  yieldPercent?: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface StorageLocation {
  id: string;
  code: string;
  name: string;
  description?: string;
  capacity?: number;
  isActive: boolean;
}

export interface StorageRecord {
  id: string;
  productId: string;
  locationId?: string;
  batchNumber: string;
  quantity: number;
  reservedQty: number;
  productionDate?: string;
  expiryDate?: string;
  unitCost?: number;
  product: Product;
  location?: StorageLocation;
}

export interface StockTransaction {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'WASTAGE' | 'SPOILAGE' | 'ADJUSTMENT' | 'PRODUCTION_USE';
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
}
