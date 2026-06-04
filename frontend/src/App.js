import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Cursos from '@/pages/Cursos';
import CursoDetalhes from '@/pages/CursoDetalhes';
import Trilhas from '@/pages/Trilhas';
import Colaboradores from '@/pages/Colaboradores';
import MinhasCursos from '@/pages/MeusCursos';
import Relatorios from '@/pages/Relatorios';
import RegrasObrigatorias from '@/pages/RegrasObrigatorias';
import { Toaster } from '@/components/ui/sonner';
import { canAccessRoute, PROFILE_IDS } from '@/utils/auth';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

function ProtectedRoute({ user, allowedProfiles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessRoute(user, allowedProfiles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="App">
        <Toaster position="top-right" richColors />
        <HashRouter>
          <Routes>
            <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR, PROFILE_IDS.AUDITOR]}><Dashboard /></ProtectedRoute>} />
            <Route path="/cursos" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR, PROFILE_IDS.AUDITOR]}><Cursos /></ProtectedRoute>} />
            <Route path="/cursos/:id" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR, PROFILE_IDS.AUDITOR]}><CursoDetalhes /></ProtectedRoute>} />
            <Route path="/trilhas" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN, PROFILE_IDS.AUDITOR]}><Trilhas /></ProtectedRoute>} />
            <Route path="/colaboradores" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN]}><Colaboradores /></ProtectedRoute>} />
            <Route path="/meus-cursos" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN, PROFILE_IDS.COLABORADOR]}><MinhasCursos /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN, PROFILE_IDS.AUDITOR]}><Relatorios /></ProtectedRoute>} />
            <Route path="/regras" element={<ProtectedRoute user={user} allowedProfiles={[PROFILE_IDS.ADMIN]}><RegrasObrigatorias /></ProtectedRoute>} />
          </Routes>
        </HashRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
