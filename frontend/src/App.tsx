import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import IngredientsPage from './pages/inventory/IngredientsPage';
import SuppliersPage from './pages/inventory/SuppliersPage';
import StockTransactionsPage from './pages/inventory/StockTransactionsPage';
import RecipesPage from './pages/recipes/RecipesPage';
import RecipeDetailPage from './pages/recipes/RecipeDetailPage';
import ProductsPage from './pages/products/ProductsPage';
import CategoriesPage from './pages/products/CategoriesPage';
import ProductionExecutionPage from './pages/production/ProductionExecutionPage';
import ProductionPlansPage from './pages/production/ProductionPlansPage';
import ProductionPlanDetailPage from './pages/production/ProductionPlanDetailPage';
import ProductionBatchesPage from './pages/production/ProductionBatchesPage';
import StoragePage from './pages/storage/StoragePage';
import StorageLocationsPage from './pages/storage/StorageLocationsPage';
import EssoPage from './pages/esso/EssoPage';
import WeeklyPage from './pages/weekly/WeeklyPage';
import TeamPage from './pages/team/TeamPage';
import StammdatenPage from './pages/stammdaten/StammdatenPage';
import BusinessJournalPage from './pages/journal/BusinessJournalPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="inventory/ingredients" element={<IngredientsPage />} />
          <Route path="inventory/suppliers" element={<SuppliersPage />} />
          <Route path="inventory/stock" element={<StockTransactionsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/categories" element={<CategoriesPage />} />
          <Route path="production/execute" element={<ProductionExecutionPage />} />
          <Route path="production/plans" element={<ProductionPlansPage />} />
          <Route path="production/plans/:id" element={<ProductionPlanDetailPage />} />
          <Route path="production/batches" element={<ProductionBatchesPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="storage/locations" element={<StorageLocationsPage />} />
          <Route path="esso" element={<EssoPage />} />
          <Route path="weekly" element={<WeeklyPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="stammdaten" element={<StammdatenPage />} />
          <Route path="journal" element={<BusinessJournalPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
