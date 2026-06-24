# CakeERP — Cake Production Management System

A full-stack ERP application built for cake manufacturing operations. Covers the complete
production lifecycle from raw materials to finished goods.

## Modules

| Module | Description |
|--------|-------------|
| **Inventory Management (IM)** | Ingredients, suppliers, stock transactions (in/out/wastage/spoilage), real-time valuation |
| **Recipe Management (RM)** | Recipes with versioning, ingredient consumption, cost calculation |
| **Product Management (PM)** | Finished products linked to recipes, unit economics, categories |
| **Production Planning (PP)** | Daily/weekly plans, pick lists, batch execution, yield tracking |
| **Storage Management (SM)** | Finished goods, FIFO/FEFO, location tracking, expiry alerts |
| **Management Dashboard (MD)** | KPIs, charts, top products, COGS, material forecast |

## Data Flow

```
IM (Ingredients) → RM (Recipes) → PM (Products) → PP (Production) → SM (Storage) → MD (Dashboard)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (Node.js) + TypeScript |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (HS256) with role-based access |
| API Docs | Swagger / OpenAPI |
| Charts | Recharts |
| Container | Docker + Docker Compose |

## Quick Start (Docker)

```bash
# 1. Clone and enter directory
cd cakeerp

# 2. Copy env file
cp .env.example .env   # Edit JWT_SECRET and passwords for production

# 3. Start all services
docker compose up -d

# 4. Wait ~30s for DB init + seed, then open:
#    Frontend:  http://localhost:3000
#    API Docs:  http://localhost:4000/api/docs
```

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally
- pnpm or npm

### Backend

```bash
cd backend

# Install dependencies
npm install

# Set up .env (copy from .env.example, update DATABASE_URL)
cp ../.env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npx ts-node prisma/seed.ts

# Start dev server
npm run start:dev
# → http://localhost:4000
# → Swagger: http://localhost:4000/api/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cakeerp.com | admin123 |
| Production | production@cakeerp.com | prod123 |
| Inventory | inventory@cakeerp.com | inv123 |

## Seed Data Included

- 3 Suppliers
- 10 Ingredients (flour, sugar, butter, eggs, milk, cocoa, etc.)
- 4 Recipes (Vanilla Cake, Chocolate Fudge Cake, Vanilla Cupcakes, Cheesecake)
- 4 Products with full unit economics
- 3 Product Categories
- 1 Sample Production Plan
- 3 Storage Records
- 3 Storage Locations

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register user |
| GET  | `/api/auth/profile` | Current user |
| GET  | `/api/auth/users` | List users (admin) |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/inventory/ingredients` | List / Create ingredients |
| GET/PATCH/DELETE | `/api/inventory/ingredients/:id` | CRUD ingredient |
| GET | `/api/inventory/ingredients/valuation` | Real-time inventory value |
| GET/POST | `/api/inventory/suppliers` | List / Create suppliers |
| GET | `/api/inventory/stock/transactions` | Stock history |
| GET | `/api/inventory/stock/alerts/low-stock` | Low stock alerts |
| POST | `/api/inventory/stock/stock-in` | Receive stock |
| POST | `/api/inventory/stock/stock-out` | Issue stock |
| POST | `/api/inventory/stock/wastage` | Record wastage / spoilage |

### Recipes
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/recipes` | List / Create recipes |
| GET/PATCH/DELETE | `/api/recipes/:id` | CRUD recipe |
| GET | `/api/recipes/:id/versions` | Version history |
| GET | `/api/recipes/:id/cost` | Cost breakdown |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/products` | List / Create products |
| GET/PATCH/DELETE | `/api/products/:id` | CRUD product |
| GET | `/api/products/top-margin` | Top products by margin |
| GET/POST | `/api/products/categories` | List / Create categories |

### Production
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/production/plans` | List / Create plans |
| GET/PATCH/DELETE | `/api/production/plans/:id` | CRUD plan |
| POST | `/api/production/plans/:id/confirm` | Confirm plan + check stock |
| GET | `/api/production/plans/:id/pick-list` | Ingredient pick list |
| GET/POST | `/api/production/batches` | List / Create batches |
| POST | `/api/production/batches/:id/start` | Start batch |
| POST | `/api/production/batches/:id/complete` | Complete + record yield |

### Storage
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/storage` | List / Create records |
| GET | `/api/storage/summary` | Stock summary by product |
| GET | `/api/storage/expiring` | Expiring stock alerts |
| GET | `/api/storage/fifo/:productId` | FIFO/FEFO order |
| POST | `/api/storage/:id/movement` | Record movement |
| GET/POST | `/api/storage/locations` | Storage locations |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/overview` | KPI cards |
| GET | `/api/dashboard/production-efficiency` | Yield + batch metrics |
| GET | `/api/dashboard/top-products` | Top by margin |
| GET | `/api/dashboard/stock-trend` | 30-day stock movement |
| GET | `/api/dashboard/cogs` | Cost of goods sold |
| GET | `/api/dashboard/forecast` | Material reorder forecast |

## Running Tests

```bash
cd backend
npm test           # Unit tests
npm run test:cov   # With coverage report
npm run test:e2e   # End-to-end tests
```

## Project Structure

```
cakeerp/
├── backend/
│   ├── src/
│   │   ├── auth/              # JWT auth, guards, strategies
│   │   ├── inventory/         # IM module (ingredients, suppliers, stock)
│   │   ├── recipe/            # RM module (recipes, versioning, cost)
│   │   ├── product/           # PM module (products, categories, economics)
│   │   ├── production/        # PP module (plans, batches, yield)
│   │   ├── storage/           # SM module (finished goods, FIFO/FEFO)
│   │   ├── dashboard/         # MD module (analytics, KPIs, forecasts)
│   │   ├── common/
│   │   │   └── prisma/        # Prisma service (global)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma      # DB schema
│   │   └── seed.ts            # Demo data seed
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios API clients (all modules)
│   │   ├── components/
│   │   │   ├── layout/        # Sidebar, header layout
│   │   │   └── ui/            # Modal, Table, StatCard, PageHeader
│   │   ├── hooks/             # Auth helpers
│   │   ├── pages/
│   │   │   ├── dashboard/     # KPI charts, alerts, forecast
│   │   │   ├── inventory/     # Ingredients, Suppliers, Transactions
│   │   │   ├── recipes/       # Recipe list + detail with versioning
│   │   │   ├── products/      # Products + Categories
│   │   │   ├── production/    # Plans, detail, batches
│   │   │   └── storage/       # Finished goods, locations
│   │   ├── types/             # TypeScript interfaces
│   │   └── App.tsx            # Router
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── postman-collection.json    # Full API test collection
└── .env.example
```

## Key Business Rules Enforced

1. **Referential integrity**: Ingredients cannot be hard-deleted if used in active recipes — soft-deleted instead
2. **Deletion cascade**: Recipes soft-deleted if linked to products; products soft-deleted if in production/storage
3. **Stock validation**: Stock-out / wastage checks current stock before allowing negative values
4. **Recipe versioning**: Every update to a recipe creates a version snapshot with timestamp
5. **FIFO/FEFO**: Storage records ordered by expiry date then production date for dispatch suggestions
6. **Production confirmation**: Checks ingredient availability vs. required quantities and reports shortages
7. **Cost propagation**: Product economics recalculate from linked recipe on every read
8. **Dropdown source of truth**: Ingredients, recipes and products are all fetched from their master modules — no data duplication
