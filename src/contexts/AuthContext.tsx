import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'employee';
  status: 'active' | 'inactive';
  department: string;
  joinedDate: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (profileData: UpdateProfileData) => Promise<boolean>;
  updatePassword: (passwordData: UpdatePasswordData) => Promise<boolean>;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'hr' | 'employee';
}

interface UpdateProfileData {
  name: string;
  email: string;
  department: string;
}

interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);
  const checkAuthStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        toast.success(data.message);
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    }
  };
  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        toast.success(data.message);
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const updateProfile = async (profileData: UpdateProfileData): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        toast.success(data.message);
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Profile update failed. Please try again.');
      return false;
    }
  };

  const updatePassword = async (passwordData: UpdatePasswordData): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.UPDATE_PASSWORD, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Password update failed. Please try again.');
      return false;
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUser,
    updateProfile,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};