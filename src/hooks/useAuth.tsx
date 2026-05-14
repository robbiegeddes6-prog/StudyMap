import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
}

interface AuthContextType {
  session: { user: AuthUser } | null;
  user: AuthUser | null;
  loading: boolean;
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
}

function toAuthUser(supabaseUser: NonNullable<Session["user"]>): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    display_name:
      (supabaseUser.user_metadata?.display_name as string | undefined) ??
      supabaseUser.email?.split("@")[0],
  };
}

async function fetchIsPremium(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .maybeSingle();
    return !!data?.is_premium;
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isPremium: false,
  setIsPremium: () => {},
  signOut: async () => {},
  signIn: async () => {},
  signUp: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<{ user: AuthUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s ? { user: toAuthUser(s.user) } : null);
      if (s?.user) {
        const premium = await fetchIsPremium(s.user.id);
        setIsPremium(premium);
        localStorage.setItem("studybuddy_is_premium", String(premium));
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s ? { user: toAuthUser(s.user) } : null);
      if (s?.user) {
        const premium = await fetchIsPremium(s.user.id);
        setIsPremium(premium);
        localStorage.setItem("studybuddy_is_premium", String(premium));
      } else {
        setIsPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split("@")[0] } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsPremium(false);
    localStorage.removeItem("studybuddy_is_premium");
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, isPremium, setIsPremium, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
