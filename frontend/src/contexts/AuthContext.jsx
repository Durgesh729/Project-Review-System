import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Loader from '../components/ui/Loader';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);

          // Fetch profile
          fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);

        if (session?.user) {
          console.log('Auth state change - User found:', session.user.email);

          // Check email domain for all users (including Google OAuth)
          if (!validateEmailDomain(session.user.email)) {
            console.error('Invalid email domain:', session.user.email);
            await supabase.auth.signOut();
            setUser(null);
            setUserProfile(null);
            setActiveRole(null);
            setLoading(false);
            return;
          }

          setUser(session.user);
          console.log('User set in context');

          // Try to fetch real profile in background
          fetchUserProfile(session.user.id);
        } else {
          console.log('Auth state change - No user');
          setUser(null);
          setUserProfile(null);
          setActiveRole(null);
        }
        setLoading(false);
        console.log('Auth loading set to false');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, retryCount = 0) => {
    console.log('Fetching user profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);

        // If user profile doesn't exist, try to create it manually
        if (error.code === 'PGRST116' && retryCount < 2) {
          console.log(`User profile not found, attempting to create... (attempt ${retryCount + 1})`);

          // Get current session to get user info
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // For new users, default to pending with empty roles
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                role: null,
                roles: [],
                isVerified: true,
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // Don't retry indefinitely - keep the temporary profile
              if (retryCount < 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchUserProfile(userId, retryCount + 1);
              }
            } else {
              console.log('User profile created successfully:', insertData);
              setUserProfile(insertData);
              localStorage.setItem('userProfile', JSON.stringify(insertData));
              initializeActiveRole(insertData);
              return;
            }
          }
        }

        // If we can't fetch or create the profile, keep the temporary one
        console.log('Keeping temporary profile for navigation');
        return;
      }

      console.log('User profile fetched successfully:', data);
      setUserProfile(data);
      // Store in localStorage for compatibility with existing components
      localStorage.setItem('userProfile', JSON.stringify(data));

      initializeActiveRole(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Keep temporary profile on error
      console.log('Keeping temporary profile due to error');
    }
  };

  const initializeActiveRole = (profile) => {
    const storedActiveRole = localStorage.getItem('activeRole');
    console.log('Stored active role:', storedActiveRole);
    console.log('User roles:', profile.roles);

    if (storedActiveRole && profile.roles && profile.roles.includes(storedActiveRole)) {
      console.log('Setting active role from localStorage:', storedActiveRole);
      setActiveRole(storedActiveRole);
    } else if (profile.roles && profile.roles.length > 0) {
      console.log('Setting active role to first role:', profile.roles[0]);
      setActiveRole(profile.roles[0]);
      localStorage.setItem('activeRole', profile.roles[0]);
    } else if (profile.role) {
      console.log('Setting active role to primary role:', profile.role);
      setActiveRole(profile.role);
      localStorage.setItem('activeRole', profile.role);
    } else {
      console.log('No valid role found. User must select a role.');
      setActiveRole(null);
      localStorage.removeItem('activeRole');
    }
  };

  // Email domain validation
  const validateEmailDomain = (email) => {
    // Development mode - allow specific test emails
    const isDevelopment = import.meta.env.DEV;
    const testEmails = [
      'atharvghosalkar22@gmail.com', // Test email
      'test@gmail.com',
      'admin@gmail.com',
      'mentee@git-india.edu.in',
      'mentor@git-india.edu.in',
      'hod@git-india.edu.in',
      'coordinator@git-india.edu.in',
    ];

    if (isDevelopment && testEmails.includes(email.toLowerCase())) {
      return true;
    }

    return email.toLowerCase().endsWith('@git-india.edu.in');
  };

  const signUp = async (email, password, userData) => {
    try {
      // Validate email domain
      if (!validateEmailDomain(email)) {
        throw new Error('Only @git-india.edu.in email addresses are allowed');
      }

      // Validate password strength
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Validate required fields
      if (!userData.name?.trim()) {
        throw new Error('Name is required');
      }

      const signupOptions = {
        data: {
          name: userData.name.trim(),
          role: userData.role || null,
        },
        emailRedirectTo: import.meta.env.VITE_FRONTEND_URL || `${window.location.origin}/auth/callback`,
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: signupOptions,
      });

      if (error) throw error;

      // Return appropriate message based on environment
      const message = import.meta.env.DEV
        ? 'Account created successfully! You will be logged in automatically.'
        : 'Please check your email and click the verification link to complete registration.';

      return {
        data,
        error: null,
        message,
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      // Validate inputs
      if (!email?.trim()) {
        throw new Error('Email is required');
      }

      if (!password?.trim()) {
        throw new Error('Password is required');
      }

      // Validate email domain
      if (!validateEmailDomain(email)) {
        throw new Error('Only @git-india.edu.in email addresses are allowed');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
        }
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at && !import.meta.env.DEV) {
        throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
      }

      console.log('Sign in successful:', data.user?.email);
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const isDevelopment = import.meta.env.DEV;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.VITE_FRONTEND_URL || `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            // Only restrict domain in production
            ...(isDevelopment ? {} : { hd: 'git-india.edu.in' }),
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }

      console.log('Google OAuth initiated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserProfile(null);
      setActiveRole(null);
      // Clear localStorage
      localStorage.removeItem('userProfile');
      localStorage.removeItem('activeRole');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Allow components to update just the active role without hitting Supabase
  const updateActiveRole = (role) => {
    setActiveRole(role);
    localStorage.setItem('activeRole', role);
  };

  // Ensure we sync local profile writes with the new role switching flow
  const updateUserProfile = (profile) => {
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));

    const storedActiveRole = localStorage.getItem('activeRole');
    if (storedActiveRole && profile.roles && profile.roles.includes(storedActiveRole)) {
      setActiveRole(storedActiveRole);
    } else if (profile.roles && profile.roles.length > 0) {
      setActiveRole(profile.roles[0]);
      localStorage.setItem('activeRole', profile.roles[0]);
    } else if (profile.role) {
      setActiveRole(profile.role);
      localStorage.setItem('activeRole', profile.role);
    } else {
      setActiveRole(null);
      localStorage.removeItem('activeRole');
    }
  };

  const value = {
    user,
    userProfile,
    activeRole,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    updateActiveRole,
    validateEmailDomain,
    isAuthenticated: !!user,
    isVerified: userProfile?.isVerified || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && <Loader />}
      {!loading && children}
    </AuthContext.Provider>
  );
};