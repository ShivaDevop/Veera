import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeRole: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveRole: (role: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeRole, setActiveRoleState] = useState<string | null>(
    localStorage.getItem('activeRole'),
  );

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (activeRole) {
        api.defaults.headers.common['X-Active-Role'] = activeRole;
      }
    }
  }, [token, activeRole]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, user: userData } = response.data;
    
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('token', accessToken);
    
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    if (userData.roles && userData.roles.length > 0) {
      const studentRole = userData.roles.find((r: string) => r === 'Student');
      if (studentRole) {
        setActiveRole('Student');
        localStorage.setItem('activeRole', 'Student');
        api.defaults.headers.common['X-Active-Role'] = 'Student';
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveRoleState(null);
    localStorage.removeItem('token');
    localStorage.removeItem('activeRole');
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['X-Active-Role'];
  };

  const setActiveRole = (role: string) => {
    setActiveRoleState(role);
    localStorage.setItem('activeRole', role);
    api.defaults.headers.common['X-Active-Role'] = role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeRole,
        login,
        logout,
        setActiveRole,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

