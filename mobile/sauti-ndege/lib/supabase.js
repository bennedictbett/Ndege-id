import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://cbhvaqscbttfdokbktxj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaHZhcXNjYnR0ZmRva2JrdHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTQ4OTgsImV4cCI6MjA5NjY3MDg5OH0.tQcYASeCyWHEZeX01vmm0zva0k07QVpr1ugQ3BUdXsk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No email-link deep-linking in this app (we use 6-digit OTP codes
    // typed in by hand instead), so URL-based session detection is unused.
    detectSessionInUrl: false,
  },
});