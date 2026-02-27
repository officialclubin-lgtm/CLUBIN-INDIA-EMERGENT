import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string;
  age?: number;
  date_of_birth?: string;
  id_card_type?: string;
  id_card_number?: string;
  id_card_image?: string;
  is_verified: boolean;
  verification_status: string;
  terms_accepted: boolean;
  location?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionToken: string | null;
  sendOTP: (phone: string) => Promise<{ success: boolean; message?: string; otp?: string }>;
  verifyOTP: (phone: string, otp: string, name: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        await fetchUserData(token);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (token: string) => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(response.data);
      setSessionToken(token);
    } catch (error) {
      console.error('Error fetching user:', error);
      await AsyncStorage.removeItem('session_token');
      setSessionToken(null);
      setUser(null);
    }
  };

  const sendOTP = async (phone: string) => {
    try {
      const response = await axios.post(
        `${EXPO_PUBLIC_BACKEND_URL}/api/auth/otp/send`,
        { phone }
      );
      
      return {
        success: true,
        message: response.data.message,
        otp: response.data.otp, // For demo mode
      };
    } catch (error: any) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to send OTP',
      };
    }
  };

  const verifyOTP = async (phone: string, otp: string, name: string) => {
    try {
      const response = await axios.post(
        `${EXPO_PUBLIC_BACKEND_URL}/api/auth/otp/verify`,
        { phone, otp, name }
      );

      const { session_token, user: userData } = response.data;
      
      await AsyncStorage.setItem('session_token', session_token);
      setSessionToken(session_token);
      setUser(userData);

      return {
        success: true,
        message: 'Login successful',
      };
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Invalid OTP',
      };
    }
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        await axios.post(
          `${EXPO_PUBLIC_BACKEND_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${sessionToken}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      setUser(null);
      setSessionToken(null);
    }
  };

  const refreshUser = async () => {
    if (sessionToken) {
      await fetchUserData(sessionToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionToken, sendOTP, verifyOTP, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
