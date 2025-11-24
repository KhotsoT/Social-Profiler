'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Instagram, Twitter, Music, Facebook, Youtube, Linkedin, CheckCircle } from 'lucide-react'

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'from-blue-400 to-blue-600' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'from-black to-gray-800' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-700' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-800' },
]

export default function ConnectAccountsPage() {
  const router = useRouter()
  const params = useParams()
  const influencerId = params.id as string
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set())

  const handleConnectPlatform = async (platform: string) => {
    setLoading(true)
    setError(null)

    try {
      // OAuth requires HTTPS - use ngrok tunnel or deployed backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/auth/${platform}`)
      const data = await response.json()

      if (!data.authUrl) {
        throw new Error('Failed to get authorization URL')
      }

      // Store influencer ID and code verifier for callback
      sessionStorage.setItem('connect_influencer_id', influencerId)
      sessionStorage.setItem('oauth_state', data.state)
      sessionStorage.setItem('oauth_platform', platform)
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

  // Check if we're returning from OAuth callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const platform = urlParams.get('platform')

      if (code && platform) {
        handleOAuthCallback(code, platform)
      }
    }
  }, [])

  const handleOAuthCallback = async (code: string, platform: string) => {
    setLoading(true)
    try {
      // OAuth requires HTTPS - use ngrok tunnel or deployed backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
      const storedInfluencerId = sessionStorage.getItem('connect_influencer_id')
      
      if (!storedInfluencerId) {
        throw new Error('Influencer ID not found')
      }

      const callbackUrl = `${apiUrl}/api/auth/${platform}/callback?code=${code}${codeVerifier ? `&code_verifier=${encodeURIComponent(codeVerifier)}` : ''}`
      const response = await fetch(callbackUrl)
      const data = await response.json()

      if (data.success) {
        // Add new social account to existing influencer (without deleting existing ones)
        const addResponse = await fetch(`${apiUrl}/api/influencers/${storedInfluencerId}/social-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            username: data.username,
            platformId: data.userId,
          }),
        })

        if (addResponse.ok) {
          // Redirect back to influencer page
          router.push(`/influencers/${storedInfluencerId}`)
        } else {
          const errorData = await addResponse.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to add account to influencer')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete connection')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push(`/influencers/${influencerId}`)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Profile</span>
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Connect Social Media Accounts
          </h1>
          <p className="text-slate-600 mb-8">
            Connect your social media accounts to see analytics and follower data.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}

