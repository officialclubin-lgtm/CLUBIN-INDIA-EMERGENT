import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
    
    // Handle deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
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

  const handleDeepLink = async (event: { url: string }) => {
    const { url } = event;
    await processAuthUrl(url);
  };

  const processAuthUrl = async (url: string) => {
    // Parse session_id from URL (hash or query)
    let sessionId = null;
    
    if (url.includes('#session_id=')) {
      sessionId = url.split('#session_id=')[1]?.split('&')[0];
    } else if (url.includes('?session_id=')) {
      sessionId = url.split('?session_id=')[1]?.split('&')[0];
    }

    if (sessionId) {
      await exchangeSessionId(sessionId);
    }
  };

  const exchangeSessionId = async (sessionId: string) => {
    try {
      const response = await axios.post(
        `${EXPO_PUBLIC_BACKEND_URL}/api/auth/session`,
        {},
        {
          headers: {
            'X-Session-ID': sessionId,
          },
        }
      );

      const { session_token } = response.data;
      await AsyncStorage.setItem('session_token', session_token);
      setSessionToken(session_token);
      await fetchUserData(session_token);
    } catch (error) {
      console.error('Error exchanging session:', error);
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
    }
  };

  const login = async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${EXPO_PUBLIC_BACKEND_URL}/`
        : Linking.createURL('/');

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await processAuthUrl(result.url);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sessionToken }}>
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
