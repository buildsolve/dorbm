import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Package, BookOpen, ShoppingBag, Factory, Warehouse,
  ChevronDown, ChevronRight, LogOut, Menu, Cake, TrendingUp, Users, Settings2, ScrollText
} from 'lucide-react';
import { getStoredUser, clearAuth } from '../../hooks/useAuth';
import clsx from 'clsx';

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  {
    label: 'Inventory', icon: Package, children: [
      { label: 'Ingredients', to: '/inventory/ingredients' },
      { label: 'Suppliers', to: '/inventory/suppliers' },
      { label: 'Stock Transactions', to: '/inventory/stock' },
    ],
  },
  {
    label: 'Recipes', icon: BookOpen, children: [
      { label: 'All Recipes', to: '/recipes' },
    ],
  },
  {
    label: 'Products', icon: ShoppingBag, children: [
      { label: 'Products', to: '/products' },
      { label: 'Categories', to: '/products/categories' },
    ],
  },
  {
    label: 'Production', icon: Factory, children: [
      { label: 'Aktuelle Woche', to: '/production/execute' },
      { label: 'Wochenplanung', to: '/weekly' },
      { label: 'Production Plans', to: '/production/plans' },
      { label: 'Batches', to: '/production/batches' },
    ],
  },
  {
    label: 'Storage', icon: Warehouse, children: [
      { label: 'Finished Goods', to: '/storage' },
    ],
  },
  { label: 'ESSO', icon: TrendingUp, to: '/esso' },
  { label: 'Business Journal', icon: ScrollText, to: '/journal' },
  {
    label: 'Stammdaten', icon: Settings2, children: [
      { label: 'Team', to: '/team' },
      { label: 'Ausstattung', to: '/stammdaten' },
      { label: 'Lagerorte', to: '/storage/locations' },
    ],
  },
];

export default function Layout() {
  const [open, setOpen] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const user = getStoredUser();
  const navigate = useNavigate();

  const toggle = (label: string) =>
    setOpen(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-white">

      {/* Top header — white, hairline border */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-6 gap-4 bg-white"
        style={{ borderBottom: '1px solid #EBEBEB' }}
      >
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-[#6A6A6A] hover:text-[#222222] hover:bg-[#F7F7F7] p-2 rounded-full transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Cake className="w-7 h-7" style={{ color: '#FF385C' }} />
          <span className="font-extrabold text-lg tracking-tight" style={{ color: '#FF385C' }}>cakeerp</span>
          <span className="text-[#6A6A6A] text-xs ml-2 hidden sm:inline">Production Management</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[#6A6A6A] text-xs">
            {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <div
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-[#DDDDDD] hover:shadow-md transition-shadow cursor-default"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: '#222222' }}
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-[#222222] text-xs font-medium">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-[#6A6A6A] hover:text-[#222222] ml-1 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Left navigation — light */}
      <aside
        className={clsx(
          'fixed top-16 bottom-0 left-0 z-40 flex flex-col overflow-y-auto transition-all duration-200 bg-white',
          collapsed ? 'w-14' : 'w-60'
        )}
        style={{ borderRight: '1px solid #EBEBEB' }}
      >
        <nav className="flex-1 py-3 px-2">
          {nav.map(item =>
            item.to ? (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl mb-0.5 transition-colors',
                  isActive
                    ? 'bg-[#F7F7F7] text-[#222222] font-semibold'
                    : 'text-[#6A6A6A] hover:bg-[#F7F7F7] hover:text-[#222222]'
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-[18px] h-[18px] shrink-0" style={isActive ? { color: '#FF385C' } : undefined} />
                    {!collapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            ) : (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggle(item.label)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl mb-0.5 transition-colors text-[#6A6A6A] hover:bg-[#F7F7F7] hover:text-[#222222]"
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {open.includes(item.label)
                        ? <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                    </>
                  )}
                </button>
                {!collapsed && open.includes(item.label) && (
                  <div className="mb-1">
                    {item.children?.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => clsx(
                          'block ml-9 mr-1 px-3 py-2 text-[13px] rounded-lg transition-colors',
                          isActive
                            ? 'bg-[#FFF0F3] text-[#E31C5F] font-semibold'
                            : 'text-[#6A6A6A] hover:bg-[#F7F7F7] hover:text-[#222222]'
                        )}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </nav>

        {!collapsed && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid #EBEBEB' }}>
            <div className="text-[11px] text-[#B0B0B0] font-semibold tracking-widest uppercase">{user?.role}</div>
          </div>
        )}
      </aside>

      {/* Page content */}
      <main
        className={clsx(
          'flex-1 overflow-y-auto transition-all duration-200 bg-white',
          collapsed ? 'ml-14' : 'ml-60'
        )}
        style={{ marginTop: '64px' }}
      >
        <div className="px-8 py-7 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
