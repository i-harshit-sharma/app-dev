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
      console.log("[AuthContext] Bootstrapping Auth");
      try {
        const savedToken = await getStoredToken();
        if (savedToken && savedToken !== "null" && savedToken !== "undefined") {
          console.log("[AuthContext] Found saved token, verifying...");
          try {
            const response = await AuthService.getMe(savedToken);
            if (response.success) {
              console.log("[AuthContext] Token valid, user restored:", response.user?.email);
              setToken(savedToken);
              setUser(response.user);
            } else {
              console.log("[AuthContext] Token invalid (success: false), clearing stored token");
              await clearStoredToken();
            }
          } catch (verificationError) {
            console.log("[AuthContext] Token verification error, clearing stored token:", verificationError);
            await clearStoredToken();
          }
        } else {
          console.log("[AuthContext] No saved token found or token was invalid string");
          if (savedToken) await clearStoredToken();
        }
      } catch (error) {
        console.error("[AuthContext] Failed to restore token:", error);
      } finally {
        console.log("[AuthContext] Bootstrap complete");
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const register = async (data: RegisterPayload) => {
    console.log("[AuthContext] Registering user with input payload:", data);
    try {
      await AuthService.register(data);
      console.log("[AuthContext] Register successful");
    } catch (error) {
      console.error("[AuthContext] Register failed:", error);
      throw error;
    }
  };

  const login = async (data: LoginPayload) => {
    console.log("[AuthContext] Logging in user with email:", data.email);
    try {
      const response = await AuthService.login(data);
      setToken(response.token);
      setUser(response.user);
      await setStoredToken(response.token);
      console.log("[AuthContext] Login successful");
    } catch (error) {
      console.error("[AuthContext] Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    console.log("[AuthContext] Logging out user");
    try {
      setUser(null);
      setToken(null);
      await clearStoredToken();
      console.log("[AuthContext] Logout successful");
    } catch (error) {
      console.error("[AuthContext] Logout failed:", error);
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; phone?: string; password?: string; passwordConfirm?: string }) => {
    console.log("[AuthContext] Updating profile");
    if (!token) throw new Error("Not authenticated");
    try {
      const response = await AuthService.updateProfile(token, data);
      setUser(response.user);
      console.log("[AuthContext] Profile update successful");
    } catch (error) {
      console.error("[AuthContext] Profile update failed:", error);
      throw error;
    }
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
