import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Handle magic link authentication
  const handleMagicLink = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setMessage('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // Redirect back to our app after email confirmation
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Check your email for the login link!')
      }
    } catch (error) {
      setMessage(`Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CrisisCtrl Admin
          </h1>
          <p className="text-gray-600">
            Administrator login for emergency response management
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleMagicLink} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Magic Link'
            )}
          </button>
        </form>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            message.includes('Error') || message.includes('error')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-500">
            We'll send you a secure login link. No password required!
          </p>
          <a
            href="/"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to CrisisCtrl
          </a>
        </div>
      </div>
    </div>
  )
}

export default AuthPage