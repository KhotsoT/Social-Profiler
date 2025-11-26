'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Instagram, Twitter, Music, Facebook, Youtube, Linkedin, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'from-blue-400 to-blue-600' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'from-black to-gray-800' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-700' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-800' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'connect'>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setError('Please fill in all fields')
      return
    }
    setStep('connect')
    setError(null)
  }

  const handleOAuthCallback = useCallback(async (code: string, platform: string) => {
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
      const callbackUrl = `${apiUrl}/api/auth/${platform}/callback?code=${code}${codeVerifier ? `&code_verifier=${encodeURIComponent(codeVerifier)}` : ''}`
      const response = await fetch(callbackUrl)
      const data = await response.json()

      if (data.success) {
        setConnectedPlatforms(prev => new Set([...prev, platform]))
        
        // Get stored registration data
        const storedData = sessionStorage.getItem('register_data')
        if (storedData) {
          const registerData = JSON.parse(storedData)
          
          // Create influencer with connected account
          const influencer = await api.createInfluencer({
            name: registerData.name,
            email: registerData.email,
            socialAccounts: [{
              platform,
              username: data.username,
              platformId: data.userId,
              // The backend will use the OAuth token to fetch real data
            }],
          })

          // Redirect to influencer page
          router.push(`/influencers/${influencer.id}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete connection')
      setLoading(false)
    }
  }, [router])

  // Check if we're returning from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const platform = urlParams.get('platform')

    if (code && platform) {
      // Set step to connect and handle callback
      setStep('connect')
      handleOAuthCallback(code, platform)
    }
  }, [handleOAuthCallback])

  const handleConnectPlatform = async (platform: string) => {
    setLoading(true)
    setError(null)

    try {
      // Get OAuth URL from backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/auth/${platform}`)
      const data = await response.json()

      if (!data.authUrl) {
        throw new Error('Failed to get authorization URL')
      }

      // Store state, code verifier, and form data in sessionStorage
      sessionStorage.setItem('oauth_state', data.state)
      sessionStorage.setItem('oauth_platform', platform)
      sessionStorage.setItem('register_data', JSON.stringify(formData))
      if (data.codeVerifier) {
        sessionStorage.setItem('oauth_code_verifier', data.codeVerifier)
      }

      // Redirect to OAuth provider
      window.location.href = data.authUrl
    } catch (err: any) {
      setError(err.message || `Failed to connect ${platform}`)
      setLoading(false)
    }
  }

  const handleSkipAndCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      // Create influencer account without social accounts
      // User can connect platforms later from their profile page
      const influencer = await api.createInfluencer({
        name: formData.name,
        email: formData.email,
        socialAccounts: [], // Empty - can be added later
      })

      // Redirect to influencer page where they can connect accounts later
      router.push(`/influencers/${influencer.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {step === 'info' ? 'Register as Influencer' : 'Connect Your Accounts'}
          </h1>
          <p className="text-slate-600 mb-8">
            {step === 'info' 
              ? 'Join our platform and connect your social media accounts. We\'ll use your permissions to fetch your data.'
              : 'Grant permissions to access your social media data. This allows us to show accurate analytics.'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {step === 'info' ? (
            <form onSubmit={handleInfoSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Mihlali Ndamase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Continue to Connect Accounts
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> Click on each platform you want to connect. 
                  You'll be redirected to authorize our app to access your public data. 
                  This is secure and you can revoke access anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map((platform) => {
                  const Icon = platform.icon
                  const isConnected = connectedPlatforms.has(platform.id)
                  const isConnecting = loading

                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleConnectPlatform(platform.id)}
                      disabled={isConnected || isConnecting}
                      className={`
                        relative p-6 rounded-lg border-2 transition-all
                        ${isConnected 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-slate-200 hover:border-primary-500 hover:shadow-md bg-white'
                        }
                        ${isConnecting ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                      `}
                    >
                      {isConnected && (
                        <CheckCircle className="absolute top-2 right-2 w-6 h-6 text-green-500" />
                      )}
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${platform.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">{platform.name}</h3>
                      <p className="text-sm text-slate-600">
                        {isConnected ? 'Connected' : 'Click to connect'}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="pt-6 border-t border-slate-200">
                <button
                  onClick={handleSkipAndCreate}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Skip for Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


