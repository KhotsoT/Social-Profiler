'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const platform = searchParams.get('platform')
    const code = searchParams.get('code')
    const username = searchParams.get('username')
    const userId = searchParams.get('userId')
    const accessToken = searchParams.get('accessToken')
    const state = searchParams.get('state')

    if (!platform || !username || !userId) {
      router.push('/')
      return
    }

    // Get influencer ID from sessionStorage (set when OAuth was initiated)
    const influencerId = sessionStorage.getItem('connect_influencer_id')

    if (!influencerId) {
      router.push('/')
      return
    }

    // Add social account to influencer
    const addAccount = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/influencers/${influencerId}/social-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            username,
            platformId: userId,
          }),
        })

        if (response.ok) {
          // Redirect back to influencer page
          router.push(`/influencers/${influencerId}`)
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Failed to add account:', errorData)
          router.push(`/influencers/${influencerId}/connect`)
        }
      } catch (error) {
        console.error('Error adding account:', error)
        router.push(`/influencers/${influencerId}/connect`)
      }
    }

    addAccount()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Connecting your account...</p>
      </div>
    </div>
  )
}

