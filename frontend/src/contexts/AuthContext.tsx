'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'student' | 'instructor' | 'admin';
  avatar: string;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: 'student' | 'instructor';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check both localStorage and sessionStorage for token
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const token = rememberMe 
        ? localStorage.getItem('token')
        : sessionStorage.getItem('token') || localStorage.getItem('token'); // Fallback to localStorage for backward compatibility
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear both storages on auth failure
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('rememberMe');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Save token to appropriate storage based on rememberMe
        if (rememberMe) {
          localStorage.setItem('token', token);
          localStorage.setItem('rememberMe', 'true');
          // Clear sessionStorage if exists
          sessionStorage.removeItem('token');
        } else {
          sessionStorage.setItem('token', token);
          localStorage.removeItem('rememberMe');
          // Clear localStorage token if exists (for migration)
          localStorage.removeItem('token');
        }
        
        setUser(user);
        
        // Redirect based on role
        if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (user.role === 'instructor') {
          router.push('/instructor/dashboard');
        } else {
          router.push('/my-learning');
        }
      }
    } catch (error) {
      let errorMessage = 'Login failed';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || 'Login failed';
      }
      throw new Error(errorMessage);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data);
      
      if (response.data.success) {
        const { token, user, requiresVerification } = response.data;
        
        // For registration, default to sessionStorage (not rememberMe)
        // User can login later with rememberMe if they want
        // Token is limited - only usable for verify-otp and resend-otp until email is verified
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token'); // Clear any existing localStorage token
        localStorage.removeItem('rememberMe'); // Clear rememberMe preference
        
        setUser(user);
        
        // Always redirect to OTP page after registration (requiresVerification should always be true)
        if (requiresVerification) {
          router.push(`/verify-otp?email=${encodeURIComponent(user.email)}`);
        } else {
          // Fallback: redirect based on role (shouldn't happen normally)
          if (user.role === 'admin') {
            router.push('/admin/dashboard');
          } else if (user.role === 'instructor') {
            router.push('/instructor/dashboard');
          } else {
            router.push('/my-learning');
          }
        }
      }
    } catch (error) {
      let errorMessage = 'Registration failed';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || 'Registration failed';
      }
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    // Clear both storages
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      // Check both storages for token
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const token = rememberMe 
        ? localStorage.getItem('token')
        : sessionStorage.getItem('token') || localStorage.getItem('token');
      
      if (!token) {
        setUser(null);
        return;
      }

      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Don't clear user on refresh failure
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

