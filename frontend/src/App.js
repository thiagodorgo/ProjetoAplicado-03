import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/cursos" element={user ? <Cursos /> : <Navigate to="/login" />} />
            <Route path="/cursos/:id" element={user ? <CursoDetalhes /> : <Navigate to="/login" />} />
            <Route path="/trilhas" element={user ? <Trilhas /> : <Navigate to="/login" />} />
            <Route path="/colaboradores" element={user ? <Colaboradores /> : <Navigate to="/login" />} />
            <Route path="/meus-cursos" element={user ? <MinhasCursos /> : <Navigate to="/login" />} />
            <Route path="/relatorios" element={user ? <Relatorios /> : <Navigate to="/login" />} />
            <Route path="/regras" element={user ? <RegrasObrigatorias /> : <Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
