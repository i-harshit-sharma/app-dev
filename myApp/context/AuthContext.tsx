import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService, LoginPayload, RegisterPayload } from "@/services/AuthService";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  register: (data: RegisterPayload) => Promise<void>;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; phone?: string; password?: string; passwordConfirm?: string }) => Promise<void>;
  isSignedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_TOKEN_KEY = "authToken";

async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch {
    // In-memory auth still works even if secure storage is unavailable.
  }
}

async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {
    // In-memory auth still works even if secure storage is unavailable.
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const savedToken = await getStoredToken();
        if (savedToken) {
          // Verify token is still valid
          const response = await AuthService.getMe(savedToken);
          if (response.success) {
            setToken(savedToken);
            setUser(response.user);
          } else {
            await clearStoredToken();
          }
        }
      } catch (error) {
        console.error("Failed to restore token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const register = async (data: RegisterPayload) => {
    try {
      await AuthService.register(data);
    } catch (error) {
      throw error;
    }
  };

  const login = async (data: LoginPayload) => {
    try {
      const response = await AuthService.login(data);
      setToken(response.token);
      setUser(response.user);
      await setStoredToken(response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await clearStoredToken();
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; phone?: string; password?: string; passwordConfirm?: string }) => {
    if (!token) throw new Error("Not authenticated");
    const response = await AuthService.updateProfile(token, data);
    setUser(response.user);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    register,
    login,
    logout,
    updateProfile,
    isSignedIn: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
