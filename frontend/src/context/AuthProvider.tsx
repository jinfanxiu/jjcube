import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

type Profile = {
    role: 'admin' | 'member';
    is_approved: boolean;
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
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isActive = true;

        const fetchSessionAndProfile = async () => {
            try {
                const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

                if (!isActive) return;

                if (sessionError) throw sessionError;

                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    const { data: userProfile, error } = await supabase
                        .from('profiles')
                        .select('role, is_approved')
                        .eq('id', currentSession.user.id)
                        .single();

                    if (!isActive) return;

                    if (error && error.code !== 'PGRST116') throw error;

                    setProfile(userProfile ?? null);
                } else {
                    setProfile(null);
                }
            } catch (error) {
                if (isActive) {
                    console.error('Error fetching initial data:', error);
                    setProfile(null);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        fetchSessionAndProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (isActive) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    // This listener is simpler, so profile updates can be handled separately if needed
                }
            }
        );

        return () => {
            isActive = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
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