import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { canAccessRoute, PROFILE_IDS } from '@/utils/auth';
import {
  LayoutDashboard,
  BookOpen,
  Route,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Sprout,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', profiles: [PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR, PROFILE_IDS.AUDITOR] },
    { path: '/cursos', icon: BookOpen, label: 'Cursos', profiles: [PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR, PROFILE_IDS.AUDITOR] },
    { path: '/trilhas', icon: Route, label: 'Trilhas', profiles: [PROFILE_IDS.ADMIN, PROFILE_IDS.AUDITOR] },
    { path: '/colaboradores', icon: Users, label: 'Colaboradores', profiles: [PROFILE_IDS.ADMIN] },
    { path: '/meus-cursos', icon: GraduationCap, label: 'Meus Cursos', profiles: [PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR] },
    { path: '/regras', icon: Settings, label: 'Regras Obrigatórias', profiles: [PROFILE_IDS.ADMIN] },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios', profiles: [PROFILE_IDS.ADMIN, PROFILE_IDS.AUDITOR] },
  ].filter(item => canAccessRoute(user, item.profiles));

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          size="icon"
          variant="outline"
          className="bg-white shadow-lg"
          data-testid="mobile-menu-button"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 shadow-xl z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TechSolutions</h1>
                <p className="text-xs text-gray-500">Treinamentos NR-31</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.nome}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-medium
                    transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                  data-testid={`nav-${item.path.slice(1) || 'dashboard'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={logout}
              variant="outline"
              className="w-full justify-start gap-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
