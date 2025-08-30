import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

type Profile = {
    role: 'admin' | 'member';
    is_approved: boolean;
    nickname: string | null;
    email?: string | null;
};

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Session and User state management
    useEffect(() => {
        // Get the initial session right away
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            // We set loading to false here initially, but the profile loading might take longer
        });

        // Listen for future changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // 2. Profile state management, dependent on the user
    useEffect(() => {
        // If there's no user, there's no profile to fetch.
        if (!user) {
            setProfile(null);
            setLoading(false); // No user, so we are done loading.
            return;
        }

        // User exists, so start loading the profile.
        setLoading(true);
        supabase
            .from('profiles')
            .select('role, is_approved, nickname, email')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (error && error.code !== 'PGRST116') {
                    console.error("Error fetching profile:", error.message);
                    setProfile(null);
                } else {
                    setProfile(data);
                }
                // Whether profile was found or not, we are done loading.
                setLoading(false);
            });

    }, [user]); // This effect runs whenever the user object changes.

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user,
        profile,
        loading,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};