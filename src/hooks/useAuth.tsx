import { useState, useEffect, createContext, useContext } from "react";

interface User {
  id: string;
  email: string;
  display_name?: string;
}

interface Session {
  user: User;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  signIn: async () => {},
  signUp: async () => {},
});

const AUTH_STORAGE_KEY = 'studybuddy_auth_user';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setSession({ user });
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Simple mock authentication - in a real app, you'd validate against a backend
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Create a mock user
    const user: User = {
      id: `user_${Date.now()}`,
      email: email,
      display_name: email.split('@')[0],
    };

    // Store in localStorage
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    setSession({ user });
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Create a mock user
    const user: User = {
      id: `user_${Date.now()}`,
      email: email,
      display_name: displayName || email.split('@')[0],
    };

    // Store in localStorage
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    setSession({ user });
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      signIn,
      signUp
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
