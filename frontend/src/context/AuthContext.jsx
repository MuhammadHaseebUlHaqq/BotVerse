import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('botverse_admin_token');
    const savedUser = localStorage.getItem('botverse_admin_user');
    
    if (token === 'authenticated' && savedUser) {
      setIsAuthenticated(true);
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('botverse_admin_token', 'authenticated');
    localStorage.setItem('botverse_admin_user', userData);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('botverse_admin_token');
    localStorage.removeItem('botverse_admin_user');
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 