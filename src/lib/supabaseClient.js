import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check if user is admin
export const isAdmin = (user) => {
  return user?.user_metadata?.role === 'admin'
}

// Helper function to check if user is volunteer
export const isVolunteer = (user) => {
  return user?.user_metadata?.role === 'volunteer'
}

// Helper function to check if user has elevated permissions (admin or volunteer)
export const hasElevatedPermissions = (user) => {
  return isAdmin(user) || isVolunteer(user)
}