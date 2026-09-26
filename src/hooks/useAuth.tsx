import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getCanonicalOrigin } from '@/lib/getCanonicalUrl';

import { AppRole, ROLE_LEVEL as ROLE_HIERARCHY } from '@/lib/roles';
export type { AppRole } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isSupervisorOrAbove: boolean;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role hierarchy imported from @/lib/roles

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let currentUserId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Session events can overtake bootstrap or an earlier role request.
    // Only the latest session may publish a role or finish loading.
    const acceptSession = (nextSession: Session | null) => {
      if (!active) return;
      const request = ++generation;
      const nextUserId = nextSession?.user.id ?? null;
      clearTimeout(timer);
      if (currentUserId !== nextUserId) queryClient.clear();
      currentUserId = nextUserId;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setRole(null);
      setLoading(!!nextUserId);
      if (!nextUserId) return;

      // Keep Supabase requests outside its synchronous auth callback.
      timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase.from('user_roles')
            .select('role').eq('user_id', nextUserId).maybeSingle();
          if (!active || request !== generation) return;
          const candidate = data?.role;
          setRole(!error && candidate && Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, candidate)
            ? candidate as AppRole : null);
        } catch {
          if (active && request === generation) setRole(null);
        } finally {
          if (active && request === generation) setLoading(false);
        }
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => acceptSession(nextSession)
    );
    const bootstrapGeneration = generation;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && generation === bootstrapGeneration) acceptSession(error ? null : data.session);
    }).catch(() => {
      if (active && generation === bootstrapGeneration) acceptSession(null);
    });

    return () => {
      active = false;
      ++generation;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const isAdmin = role === 'admin';
  const isManagerOrAbove = role !== null && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.manager;
  const isSupervisorOrAbove = role !== null && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.supervisor;

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${getCanonicalOrigin()}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The SIGNED_OUT event clears identity, role and cached account data.
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isManagerOrAbove, isSupervisorOrAbove, role, loading, signUp, signIn, signOut }}>
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
