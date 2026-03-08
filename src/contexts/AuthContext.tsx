import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'healthcare_professional' | 'regular_user' | 'admin';

interface DoctorRegistrationMeta {
  requested: boolean;
  bmdc_reg_number?: string;
  specialization?: string;
  phone?: string;
  email?: string;
  hospital_affiliation?: string;
  bio?: string;
}

interface SignUpMeta {
  doctor_registration?: DoctorRegistrationMeta;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { full_name: string | null; organization: string | null } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, organization?: string, meta?: SignUpMeta) => Promise<{ error: any; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AuthContextType['role']>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, organization')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    setProfile(profileData || null);
    setRole((roleData?.role as AuthContextType['role']) || null);
  };

  const ensureUserBootstrapData = async (authUser: User) => {
    const userMeta = (authUser.user_metadata || {}) as {
      full_name?: string;
      role?: AppRole;
      organization?: string;
      doctor_registration?: DoctorRegistrationMeta;
    };

    const safeRole: AppRole = ['healthcare_professional', 'regular_user', 'admin'].includes(userMeta.role || '')
      ? (userMeta.role as AppRole)
      : 'regular_user';

    await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        full_name: userMeta.full_name || authUser.email?.split('@')[0] || null,
        organization: userMeta.organization || null,
      },
      { onConflict: 'id' }
    );

    await supabase.from('user_roles').upsert(
      {
        user_id: authUser.id,
        role: safeRole,
      },
      { onConflict: 'user_id,role' }
    );

    const doctorReg = userMeta.doctor_registration;
    if (doctorReg?.requested && doctorReg.bmdc_reg_number) {
      const { data: existingDoctor } = await supabase
        .from('registered_doctors')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!existingDoctor) {
        await supabase.from('registered_doctors').insert({
          user_id: authUser.id,
          full_name: userMeta.full_name || authUser.email?.split('@')[0] || 'Doctor',
          bmdc_reg_number: doctorReg.bmdc_reg_number,
          specialization: doctorReg.specialization || null,
          phone: doctorReg.phone || null,
          email: doctorReg.email || authUser.email || null,
          hospital_affiliation: doctorReg.hospital_affiliation || null,
          bio: doctorReg.bio || null,
        });
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setTimeout(async () => {
          await ensureUserBootstrapData(nextSession.user);
          await fetchUserData(nextSession.user.id);
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await ensureUserBootstrapData(currentSession.user);
        await fetchUserData(currentSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userRole: AppRole,
    organization?: string,
    meta?: SignUpMeta
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: userRole,
          organization: organization || null,
          doctor_registration: meta?.doctor_registration || null,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    return { error, user: data.user ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
