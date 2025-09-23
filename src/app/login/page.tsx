'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/contexts/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [resendingVerification, setResendingVerification] = useState(false)
  const { signIn, signUp, user, resendVerificationEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if we should start in signup mode
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Password validation for signup
    if (isSignUp) {
      // Check required fields
      if (!firstName.trim()) {
        setError('First name is required')
        setLoading(false)
        return
      }
      
      if (!lastName.trim()) {
        setError('Last name is required')
        setLoading(false)
        return
      }
      
      // Check password length
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        setLoading(false)
        return
      }
      
      // Check password confirmation
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      
      const { error, needsVerification: needsEmailVerification } = await signUp(email, password)
      
      if (error) {
        setError(error.message)
      } else if (needsEmailVerification) {
        setNeedsVerification(true)
        setVerificationEmail(email)
        setError('')
      } else {
        // User can sign in immediately (shouldn't happen with email verification enabled)
        setError('')
        setIsSignUp(false)
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      const { error } = await signIn(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    }
    
    setLoading(false)
  }

  const handleResendVerification = async () => {
    if (!verificationEmail) return
    
    setResendingVerification(true)
    setError('')
    
    const { error } = await resendVerificationEmail(verificationEmail)
    
    if (error) {
      setError(error.message)
    } else {
      setError('')
      // Show success message temporarily
      setTimeout(() => {
        setError('')
      }, 3000)
    }
    
    setResendingVerification(false)
  }

  const handleBackToLogin = () => {
    setNeedsVerification(false)
    setIsSignUp(false)
    setVerificationEmail('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setLastName('')
    setCompany('')
    setError('')
  }

  // Show verification UI if user needs to verify email
  if (needsVerification) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center">
              <Image 
                src="/assets/agent_icon.png" 
                alt="SEOAgent" 
                width={64}
                height={64}
                style={{ height: '64px', width: '64px' }}
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            🎉 Account Created!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            We&apos;ve sent a verification email to:
          </p>
          <p className="mt-1 text-center text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md">
            {verificationEmail}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center space-y-4">
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-start space-x-3">
                  <div className="text-green-500 dark:text-green-400 text-lg">✉️</div>
                  <div className="text-sm text-green-700 dark:text-green-400 space-y-2">
                    <p className="font-medium">Please check your email inbox</p>
                    <p>Click the verification link in your email, then you&apos;ll be automatically redirected to your SEOAgent dashboard.</p>
                    <p className="text-xs text-green-600 dark:text-green-500">💡 Check your spam folder if you don&apos;t see it within a few minutes</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingVerification ? 'Resending...' : 'Resend verification email'}
                </button>

                <button
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-transparent hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back to login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isSignUp) {
    // Simple sign-in form
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center">
              <Image 
                src="/assets/agent_icon.png" 
                alt="SEOAgent" 
                width={64}
                height={64}
                style={{ height: '64px', width: '64px' }}
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            SEOAgent - AI-powered content optimization
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Please wait...' : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    New to SEOAgent?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true)
                    setError('')
                    setPassword('')
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create an account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mailgun-style signup form
  return (
    <div className="min-h-screen bg-slate-800 flex py-8">
      {/* Left side - Logo and form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-lg">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
              <Image 
                src="/assets/agent_icon.png" 
                alt="SEOAgent" 
                width={32}
                height={32}
              />
            </div>
            <span className="text-2xl font-bold text-white">SEOAgent</span>
          </div>
          
          <div className="bg-white rounded-xl shadow-xl p-6">
            <h1 className="text-xl font-semibold text-slate-800 mb-4">Get started with SEOAgent today!</h1>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Password Confirmation
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-4 text-sm text-gray-600">
              By creating a SEOAgent account, you agree to the{' '}
              <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                SEOAgent Terms of Service
              </a>
            </p>

            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setError('')
                  setPassword('')
                  setConfirmPassword('')
                  setFirstName('')
                  setLastName('')
                  setCompany('')
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Sign in instead
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Information */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 xl:px-16">
        <div className="max-w-md">
          <div className="text-white space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Why Choose SEOAgent?</h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Put your technical SEO on complete autopilot with AI-powered automation that never sleeps.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Make Your Website Google-Friendly</h3>
                  <p className="text-slate-300 text-sm">
                    Make your website more readable to Google and AI so it gets prioritized in search results and recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Create Content That Ranks</h3>
                  <p className="text-slate-300 text-sm">
                    Automatically write and publish articles that people actually search for, helping you attract more visitors
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Never Miss an Issue</h3>
                  <p className="text-slate-300 text-sm">
                    Get instant alerts when something breaks your SEO, plus automatic fixes to keep your rankings safe
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-base font-semibold mb-2">Ready to get started?</h3>
              <p className="text-slate-300 text-sm mb-3">
                Book a personalized onboarding call to maximize your SEO results
              </p>
              <a
                href="https://calendly.com/alec-aleclindz/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-white text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
              >
                Schedule Onboarding Call
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center animate-pulse">
              <Image 
                src="/assets/agent_icon.png" 
                alt="SEOAgent" 
                width={64}
                height={64}
                style={{ height: '64px', width: '64px' }}
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
