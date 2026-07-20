import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useAuthStore = create((set, get) => ({
  _authSubscription: null,
  user: null,
  profile: null,
  loading: true,
  error: null,

  // Initialize session and auth listener
  initAuth: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session) {
        set({ user: session.user });
        await get().fetchProfile(session.user.id);
      } else {
        set({ user: null, profile: null, loading: false });
      }

      // 2. Set up auth state change subscription
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (currentSession) {
          set({ user: currentSession.user });
          await get().fetchProfile(currentSession.user.id);
        } else {
          set({ user: null, profile: null, loading: false });
        }
      });
      set({ _authSubscription: subscription });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Fetch role and details from profiles table
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist yet, retry or create dummy placeholder
        throw error;
      }
      set({ profile: data, loading: false });
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      set({ profile: null, loading: false });
    }
  },

  // User Sign In
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      set({ user: data.user });
      await get().fetchProfile(data.user.id);
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // User Sign Out
  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Password recovery
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Password update
  updatePassword: async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}));
