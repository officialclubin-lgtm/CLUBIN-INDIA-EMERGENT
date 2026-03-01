import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { auth } from '../lib/firebase';
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

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
  sendOTP: (phone: string) => Promise<{ success: boolean; message?: string }>;
  confirmOTP: (code: string, name: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setupRecaptcha: (containerId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

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

  const setupRecaptcha = (containerId: string) => {
    if (Platform.OS === 'web' && !recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            recaptchaVerifierRef.current = null;
          },
        });
      } catch (error) {
        console.error('Error setting up reCAPTCHA:', error);
      }
    }
  };

  const sendOTP = async (phone: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!recaptchaVerifierRef.current) {
        return { success: false, message: 'reCAPTCHA not initialized. Please try again.' };
      }

      const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifierRef.current);
      confirmationResultRef.current = result;

      return { success: true, message: 'OTP sent successfully' };
    } catch (error: any) {
      console.error('Firebase sendOTP error:', error);
      // Reset recaptcha on error
      recaptchaVerifierRef.current = null;
      
      let message = 'Failed to send OTP';
      if (error.code === 'auth/invalid-phone-number') {
        message = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/captcha-check-failed') {
        message = 'reCAPTCHA verification failed. Please refresh and try again.';
      }
      
      return { success: false, message };
    }
  };

  const confirmOTP = async (code: string, name: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!confirmationResultRef.current) {
        return { success: false, message: 'No OTP request found. Please request a new code.' };
      }

      const result = await confirmationResultRef.current.confirm(code);
      const idToken = await result.user.getIdToken();

      // Send Firebase ID token to our backend
      const response = await axios.post(
        `${EXPO_PUBLIC_BACKEND_URL}/api/auth/firebase/verify`,
        { id_token: idToken, name }
      );

      const { session_token, user: userData } = response.data;

      await AsyncStorage.setItem('session_token', session_token);
      setSessionToken(session_token);
      setUser(userData);

      return { success: true, message: 'Login successful' };
    } catch (error: any) {
      console.error('Firebase confirmOTP error:', error);
      
      let message = 'Verification failed';
      if (error.code === 'auth/invalid-verification-code') {
        message = 'Invalid OTP. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        message = 'OTP has expired. Please request a new one.';
      }
      
      return { success: false, message };
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
      // Sign out from Firebase too
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      setUser(null);
      setSessionToken(null);
      confirmationResultRef.current = null;
      recaptchaVerifierRef.current = null;
    }
  };

  const refreshUser = async () => {
    if (sessionToken) {
      await fetchUserData(sessionToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionToken, sendOTP, confirmOTP, logout, refreshUser, setupRecaptcha }}>
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
