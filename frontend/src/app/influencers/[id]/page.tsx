'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw, Instagram, Twitter, Youtube, Linkedin, Facebook, Music, CheckCircle, XCircle } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Influencer } from '@/types/influencer'

const platformIcons = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  tiktok: Music,
}

const platformColors = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  twitter: 'bg-blue-400',
  youtube: 'bg-red-500',
  linkedin: 'bg-blue-600',
  facebook: 'bg-blue-500',
  tiktok: 'bg-black',
}

export default function InfluencerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [influencer, setInfluencer] = useState<Influencer | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadInfluencer()
      loadAnalytics()
    }
  }, [id])

  const loadInfluencer = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getInfluencer(id)
      setInfluencer(data)
    } catch (err: any) {
      console.error('Failed to load influencer:', err)
      setError(err.message || 'Failed to load influencer')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const data = await api.getInfluencerAnalytics(id)
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await api.syncInfluencer(id)
      if (result.success) {
        setInfluencer(result.influencer)
        // Show success message
        setTimeout(() => {
          setSyncing(false)
        }, 1000)
      }
    } catch (err: any) {
      console.error('Sync failed:', err)
      setError(err.message || 'Failed to sync influencer data')
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !influencer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Influencer</h2>
              <p className="text-slate-600 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  Go Back
                </button>
                <button
                  onClick={loadInfluencer}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!influencer) {
    return null
  }

  const totalFollowers = influencer.trueFollowerCount || 
    influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0);
  const totalAcrossPlatforms = influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0);
  const avgEngagement = influencer.socialAccounts.length > 0
    ? influencer.socialAccounts.reduce((sum, acc) => sum + acc.engagementRate, 0) / influencer.socialAccounts.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Search</span>
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">{influencer.name}</h1>
              {influencer.email && (
                <p className="text-slate-600">{influencer.email}</p>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-6">
              <div className="text-sm text-slate-600 mb-1">True Followers</div>
              <div className="text-3xl font-bold text-slate-900">
                {totalFollowers.toLocaleString()}
              </div>
              {influencer.trueFollowerCount && totalAcrossPlatforms > totalFollowers && (
                <div className="text-xs text-slate-500 mt-1">
                  {totalAcrossPlatforms.toLocaleString()} total across platforms
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-6">
              <div className="text-sm text-slate-600 mb-1">Average Engagement</div>
              <div className="text-3xl font-bold text-slate-900">
                {avgEngagement.toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-6">
              <div className="text-sm text-slate-600 mb-1">Platforms</div>
              <div className="text-3xl font-bold text-slate-900">
                {influencer.socialAccounts.length}
              </div>
            </div>
          </div>

          {/* Social Accounts */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Social Media Accounts</h2>
            {influencer.socialAccounts.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-800 mb-4">
                  No social media accounts connected yet. Connect your accounts to see analytics and follower data.
                </p>
                <button
                  onClick={() => router.push(`/influencers/${id}/connect`)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Connect Accounts
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {influencer.socialAccounts.map((account) => {
                const Icon = platformIcons[account.platform]
                const lastSynced = new Date(account.lastSyncedAt)
                const isRecent = Date.now() - lastSynced.getTime() < 24 * 60 * 60 * 1000

                return (
                  <div
                    key={account.platform}
                    className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`${platformColors[account.platform]} p-2 rounded-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 capitalize">{account.platform}</h3>
                          <a
                            href={account.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            @{account.username}
                          </a>
                        </div>
                      </div>
                      {account.verified && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-600">Followers</div>
                        <div className="text-xl font-bold text-slate-900">
                          {account.followerCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Following</div>
                        <div className="text-xl font-bold text-slate-900">
                          {account.followingCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Posts</div>
                        <div className="text-xl font-bold text-slate-900">
                          {account.postCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Engagement</div>
                        <div className="text-xl font-bold text-slate-900">
                          {account.engagementRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="text-xs text-slate-500">
                        Last synced: {isRecent ? 'Recently' : lastSynced.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            )}
          </div>

          {/* Categories */}
          {influencer.categories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {influencer.categories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                  >
                    {category.replace('tier-', '').replace('engagement-', '').replace('platform-', '').replace('growth-', '').replace('authenticity-', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Analytics */}
          {analytics && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Total Followers</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {analytics.totalFollowers?.toLocaleString() || '0'}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">True Followers</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {analytics.trueFollowers?.toLocaleString() || '0'}
                  </div>
                  {analytics.totalFollowers > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {((analytics.trueFollowers / analytics.totalFollowers) * 100).toFixed(1)}% unique
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Platforms</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {analytics.platforms || 0}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Avg Engagement</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {analytics.averageEngagementRate?.toFixed(1) || '0.0'}%
                  </div>
                </div>
                
                {analytics.growthTrend && (
                  <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">Growth ({analytics.growthTrend.period})</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {analytics.growthTrend.growthRate > 0 ? '+' : ''}{analytics.growthTrend.growthRate?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">
                      {analytics.growthTrend.trend || 'stable'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


