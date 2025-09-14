import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import AuthPage from './pages/AuthPage'
import VolunteerLoginPage from './pages/VolunteerLoginPage'
import Dashboard from './pages/Dashboard'

function App() {
  // State to track user session
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          {/* Admin login route */}
          <Route 
            path="/admin/login" 
            element={!session ? <AuthPage /> : <Navigate to="/" replace />} 
          />
          
          {/* Volunteer login route */}
          <Route 
            path="/volunteer/login" 
            element={!session ? <VolunteerLoginPage /> : <Navigate to="/" replace />} 
          />
          
          {/* Volunteer dashboard route (same as main dashboard but with different redirect after login) */}
          <Route 
            path="/volunteer/dashboard" 
            element={<Dashboard session={session} />} 
          />
          
          {/* Public route - Dashboard (accessible to everyone) */}
          <Route 
            path="/" 
            element={<Dashboard session={session} />} 
          />
          
          {/* Catch all - redirect to dashboard */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App