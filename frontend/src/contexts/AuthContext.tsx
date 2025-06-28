import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '@/lib/axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Checking authentication...');
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    console.log('AuthProvider: Token found:', token ? 'YES' : 'NO');
    if (token) {
      // For demo purposes, only set user if it's a valid demo token
      if (token.startsWith('demo-jwt-token-')) {
        const demoUser = {
          id: 'demo-user-id',
          email: 'admin@example.com',
          name: 'Demo Admin',
          role: 'admin'
        };
        setUser(demoUser);
        console.log('AuthProvider: Demo user restored from token:', demoUser);
      } else {
        // Invalid token, remove it
        localStorage.removeItem('token');
        console.log('AuthProvider: Invalid token removed');
      }
    } else {
      console.log('AuthProvider: No token found, user not authenticated');
    }
    setLoading(false);
    console.log('AuthProvider: Loading set to false');
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting login with:', { email, password });
      
      const response = await axios.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      // Check if we have a token and user data
      if (response.data.token && response.data.user) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        
        // Transform user data to match our interface
        const user: User = {
          id: userData._id || userData.id,
          email: userData.email,
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          role: userData.role
        };
        
        setUser(user);
        console.log('Login successful, user set:', user);
        return true;
      }
      
      console.log('Login failed: no token or user data');
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 