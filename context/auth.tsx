import React, { createContext, useState, useContext, useEffect } from 'react';
import { UserProfile, backendAPI } from '@/services/backend';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  signUp: (username: string, pass: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check active session on mount
    backendAPI.auth.checkSession()
      .then(profile => {
        if (profile) setUser(profile);
      })
      .catch(console.error)
      .finally(() => {
        setIsReady(true);
      });

    // Listen for auth state changes (e.g. token refresh, logout from another tab)
    const { data: { subscription } } = backendAPI.auth.onAuthStateChange((profile) => {
      setUser(profile);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const profile = await backendAPI.auth.login(username, pass);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const profile = await backendAPI.auth.signUp(username, pass);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    setIsLoading(true);
    try {
      await backendAPI.auth.updatePassword(newPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // If you add backendAPI.auth.logout() later, call it here
    setUser(null);
  };

  if (!isReady) {
    return null; // Don't render anything until we know the initial auth state
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signUp, updatePassword, logout }}>
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
