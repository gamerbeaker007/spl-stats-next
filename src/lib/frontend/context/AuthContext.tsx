"use client";

import { getAuthStatus, loginAction, logoutAction } from "@/lib/backend/actions/auth-actions";
import { KeychainKeyTypes, KeychainSDK } from "keychain-sdk";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface AuthUser {
  username: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, timestamp?: number, signature?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in (from server)
  const checkAuthStatus = async () => {
    try {
      setError(null);
      const data = await getAuthStatus();

      if (data.authenticated && data.username) {
        setUser({
          username: data.username,
          isAuthenticated: true,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setError("Auth check error");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Sign message with Keychain
  const signWithKeychain = async (username: string, message: string): Promise<string> => {
    try {
      interface HiveKeychainWindow extends Window {
        hive_keychain?: unknown;
      }
      const win = window as HiveKeychainWindow;
      if (!win || !win.hive_keychain) {
        throw new Error("Keychain extension not found");
      }
      const keychain = new KeychainSDK(win);
      const result = await keychain.signBuffer({
        username: username.toLowerCase(),
        message,
        method: KeychainKeyTypes.posting,
      });

      if (result?.success) {
        const signature = typeof result.result === "string" ? result.result : result.message || "";

        if (!signature) {
          throw new Error("Keychain returned empty signature");
        }

        return signature;
      } else {
        throw new Error("Keychain signature was rejected or failed");
      }
    } catch (err) {
      let errorMessage = "Unknown Keychain error occurred";

      if (err instanceof Error) {
        errorMessage = `Keychain error: ${err.message}`;
      } else if (err && typeof err === "object" && "message" in err) {
        errorMessage = `Keychain error: ${err.message}`;
      }

      console.error("Keychain signing error:", err);
      throw new Error(errorMessage);
    }
  };

  // Login function - throws errors for caller to handle
  const login = async (username: string, timestamp?: number, signature?: string) => {
    try {
      setError(null);

      const finalTimestamp = timestamp || Date.now();
      const message = `${username.toLowerCase()}${finalTimestamp}`;

      // Get signature if not provided
      const finalSignature = signature || (await signWithKeychain(username, message));

      // Use server action instead of API route
      const result = await loginAction(username.toLowerCase(), finalTimestamp, finalSignature);

      if (!result.success) {
        const errorMsg = result.error || "Login failed";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Refresh auth status after successful login
      await checkAuthStatus();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        throw err; // Re-throw API errors
      } else {
        const errorMsg = "Network error during login";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    }
  };

  // Logout function - logs errors but doesn't throw
  const logout = async () => {
    try {
      setError(null);
      await logoutAction();
    } catch (error) {
      console.error("Logout network error:", error);
      setError("Logout network error");
    } finally {
      setUser(null);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: !!user,
    refreshAuth: checkAuthStatus,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
