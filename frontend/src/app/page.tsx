'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Users, BarChart3, Sparkles, Plus, FileText } from 'lucide-react'
import InfluencerSearch from '@/components/InfluencerSearch'
import InfluencerGrid from '@/components/InfluencerGrid'
import StatsOverview from '@/components/StatsOverview'
import { Influencer, SearchFilters } from '@/types/influencer'
import { api } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalInfluencers: 0,
    totalTrueFollowers: 0,
    averageEngagement: 0,
    topCategories: [] as string[],
  })

  useEffect(() => {
    loadStats()
    loadTopInfluencers()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.getCategoryStats()
      // Process stats data - adjust based on actual API response
      if (data) {
        setStats({
          totalInfluencers: data.totalInfluencers || 0,
          totalTrueFollowers: data.totalTrueFollowers || 0,
          averageEngagement: data.averageEngagement || 0,
          topCategories: data.topCategories || [],
        })
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err)
      // Don't show error for stats, just log it
    }
  }

  const loadTopInfluencers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.discoverInfluencers(undefined, 12)
      setInfluencers(data.influencers || [])
    } catch (err: any) {
      console.error('Failed to load influencers:', err)
      setError(err.message || 'Failed to load influencers')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (filters: SearchFilters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.searchInfluencers(filters)
      setInfluencers(data.influencers || [])
      if (data.influencers.length === 0) {
        setError('No influencers found matching your criteria')
      }
    } catch (err: any) {
      console.error('Search failed:', err)
      setError(err.message || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInfluencerClick = (id: string) => {
    router.push(`/influencers/${id}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Intelligent Influencer Marketing
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Discover influencers with true follower analytics. Get accurate reach metrics 
              by deduplicating followers across all social media platforms.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <span>True Follower Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <span>AI-Powered Insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                <span>Multi-Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Search Influencers</h2>
          <div className="flex gap-2">
            <a
              href="/register"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Register as Influencer</span>
            </a>
          </div>
        </div>
        <InfluencerSearch onSearch={handleSearch} loading={loading} />
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsOverview stats={stats} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Influencer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {influencers.length > 0 ? 'Influencers' : 'Top Influencers'}
          </h2>
          {influencers.length > 0 && (
            <button 
              onClick={loadTopInfluencers}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All →
            </button>
          )}
        </div>
        <InfluencerGrid 
          influencers={influencers} 
          loading={loading}
          onInfluencerClick={handleInfluencerClick}
        />
      </div>
    </main>
  )
}



