import Constants from "expo-constants";

function resolveApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) { 
    return envUrl.replace(/\/+$/, "");
  }

  // expoGoConfig.debuggerHost is the runtime host:port injected by Expo Go,
  // e.g. "192.168.0.100:8081". We extract just the IP to build the backend URL.
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;
  const host = debuggerHost?.split(":")[0];
  if (host) {
    return `https://app-dev-taupe-three.vercel.app/api`;
  }

  return "https://app-dev-taupe-three.vercel.app/api";
}
// function resolveApiUrl() {
//   const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
//   if (envUrl) { 
//     return envUrl.replace(/\/+$/, "");
//   }

//   // expoGoConfig.debuggerHost is the runtime host:port injected by Expo Go,
//   // e.g. "192.168.0.100:8081". We extract just the IP to build the backend URL.
//   const debuggerHost =
//     Constants.expoGoConfig?.debuggerHost ??
//     (Constants as any).manifest?.debuggerHost;
//   const host = debuggerHost?.split(":")[0];
//   if (host) {
//     return `http://${host}:5000/api`;
//   }

//   return "http://localhost:5000/api";
// }

const API_URL = resolveApiUrl();

console.log(API_URL)

const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  console.log(input);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please check backend connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  msg?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export class AuthService {
  static async register(data: RegisterPayload): Promise<{
    success: boolean;
    msg: string;
    email: string;
  }> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || "Registration failed");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async verifyOtp(data: VerifyOtpPayload): Promise<AuthResponse> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || "OTP verification failed");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async resendOtp(email: string): Promise<{
    success: boolean;
    msg: string;
  }> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || "Failed to resend OTP");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async login(data: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || "Login failed");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getMe(token: string) {
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || "Failed to fetch user");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updateProfile(
    token: string,
    data: { name?: string; email?: string; phone?: string; password?: string; passwordConfirm?: string }
  ): Promise<AuthResponse> {
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || "Failed to update profile");
      }

      return result;
    } catch (error) {
      throw error;
    }
  }
}
