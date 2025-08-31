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

    useEffect(() => {
        const fetchUserAndProfile = async (session: Session | null) => {
            if (session?.user) {
                setUser(session.user);
                setSession(session);

                try {
                    const { data: profileData, error } = await supabase
                        .from('profiles')
                        .select('role, is_approved, nickname, email')
                        .eq('id', session.user.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                        throw error;
                    }

                    setProfile(profileData);
                } catch (error) {
                    console.error("Error fetching profile:", (error as Error).message);
                    setProfile(null);
                }
            } else {
                setUser(null);
                setSession(null);
                setProfile(null);
            }
            // Only set loading to false after all user and profile data has been processed
            setLoading(false);
        };

        // Get initial session and profile data
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserAndProfile(session);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                // To prevent unnecessary re-renders on tab focus,
                // only update if the user ID has actually changed.
                if (session?.user?.id !== user?.id) {
                    setLoading(true);
                    fetchUserAndProfile(session);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id]); // Depend only on user.id to stabilize the effect

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

    // Render children only when loading is finished to prevent rendering with incomplete auth data.
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