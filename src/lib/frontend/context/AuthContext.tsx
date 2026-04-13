"use client";

import { getAuthStatus, loginAction, logoutAction } from "@/lib/backend/actions/auth-actions";
import { keychainSignBuffer } from "@/lib/frontend/keychain";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface AuthUser {
  username: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
  /** Incremented each time a monitored-account re-auth succeeds. Consumers
   *  can include this in useEffect deps to react to token status changes. */
  reAuthVersion: number;
  notifyReAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reAuthVersion, setReAuthVersion] = useState(0);

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

  // Login function - throws errors for caller to handle
  const login = async (username: string) => {
    try {
      setError(null);

      const finalTimestamp = Date.now();
      const message = `${username.toLowerCase()}${finalTimestamp}`;

      // Get signature if not provided
      const finalSignature = await keychainSignBuffer(username, message);

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
    reAuthVersion,
    notifyReAuth: () => setReAuthVersion((v) => v + 1),
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
