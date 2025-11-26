'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, TrendingUp, Users, Target, ArrowUp, ArrowDown, 
  Instagram, Twitter, Youtube, Facebook, Music, Linkedin,
  RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'
import { SkeletonStats, SkeletonChart, ErrorState } from '@/components/LoadingStates'

const platformIcons: Record<string, any> = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  facebook: Facebook,
  tiktok: Music,
  linkedin: Linkedin,
}

const platformColors: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  twitter: 'bg-blue-400',
  youtube: 'bg-red-500',
  facebook: 'bg-blue-500',
  tiktok: 'bg-black',
  linkedin: 'bg-blue-600',
}

interface DashboardStats {
  totalInfluencers: number;
  totalCampaigns: number;
  totalFollowers: number;
  avgEngagement: number;
  topCategories: string[];
  platformBreakdown: Record<string, number>;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

interface PlatformStat {
  platform: string;
  count: number;
  totalFollowers: number;
  avgEngagement: number;
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([])
  const [trends, setTrends] = useState<any>(null)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [catResponse, platResponse, trendsResponse] = await Promise.all([
        api.getCategoryStats().catch(() => null),
        api.getPlatformStats().catch(() => null),
        api.getTrends().catch(() => null),
      ])

      // Process category stats
      if (catResponse) {
        setCategoryStats(catResponse.categories || [])
        setStats({
          totalInfluencers: catResponse.totalInfluencers || 0,
          totalCampaigns: 0,
          totalFollowers: catResponse.totalTrueFollowers || 0,
          avgEngagement: catResponse.averageEngagement || 0,
          topCategories: catResponse.topCategories || [],
          platformBreakdown: {},
        })
      }

      // Process platform stats
      if (platResponse) {
        setPlatformStats(platResponse.platforms || [])
        
        // Build platform breakdown
        const breakdown: Record<string, number> = {}
        platResponse.platforms?.forEach((p: any) => {
          breakdown[p.platform] = p.count
        })
        setStats(prev => prev ? { ...prev, platformBreakdown: breakdown } : prev)
      }

      // Process trends
      if (trendsResponse) {
        setTrends(trendsResponse)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          </div>
          <SkeletonStats />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <ErrorState message={error} onRetry={loadAllData} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-slate-600 mt-1">Overview of your influencer marketing performance</p>
          </div>
          <button
            onClick={loadAllData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Influencers"
            value={stats?.totalInfluencers || 0}
            icon={Users}
            trend={12}
            trendLabel="vs last month"
          />
          <StatCard
            title="Total Followers"
            value={stats?.totalFollowers || 0}
            format="compact"
            icon={TrendingUp}
            trend={8}
            trendLabel="vs last month"
          />
          <StatCard
            title="Avg Engagement"
            value={stats?.avgEngagement || 0}
            format="percent"
            icon={Target}
            trend={-2}
            trendLabel="vs last month"
          />
          <StatCard
            title="Platforms"
            value={platformStats.length}
            icon={BarChart3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Platform Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Platform Distribution</h2>
            <div className="space-y-4">
              {platformStats.map((platform) => {
                const Icon = platformIcons[platform.platform] || BarChart3
                const total = platformStats.reduce((sum, p) => sum + p.count, 0)
                const percentage = total > 0 ? (platform.count / total) * 100 : 0

                return (
                  <div key={platform.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${platformColors[platform.platform] || 'bg-slate-500'} p-2 rounded-lg`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-slate-900 capitalize">{platform.platform}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{platform.count}</div>
                        <div className="text-xs text-slate-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${platformColors[platform.platform] || 'bg-slate-500'} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {platformStats.length === 0 && (
                <p className="text-slate-500 text-center py-8">No platform data available</p>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Categories</h2>
            <div className="space-y-3">
              {categoryStats.slice(0, 10).map((cat, index) => {
                const maxCount = categoryStats[0]?.count || 1
                const percentage = (cat.count / maxCount) * 100

                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-slate-500">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900 capitalize">
                          {cat.category.replace(/-/g, ' ')}
                        </span>
                        <span className="text-sm text-slate-600">{cat.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {categoryStats.length === 0 && (
                <p className="text-slate-500 text-center py-8">No category data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Platform Details Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Platform Performance</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Influencers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total Followers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Avg Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {platformStats.map((platform) => {
                const Icon = platformIcons[platform.platform] || BarChart3

                return (
                  <tr key={platform.platform} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`${platformColors[platform.platform] || 'bg-slate-500'} p-2 rounded-lg`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-slate-900 capitalize">{platform.platform}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900">{platform.count}</td>
                    <td className="px-6 py-4 text-slate-900">{platform.totalFollowers.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-900">{platform.avgEngagement.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {platformStats.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              No platform data available. Add some influencers to see analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  format,
  trend,
  trendLabel,
}: {
  title: string
  value: number
  icon: any
  format?: 'number' | 'percent' | 'compact'
  trend?: number
  trendLabel?: string
}) {
  const formattedValue = format === 'percent' 
    ? `${value.toFixed(1)}%`
    : format === 'compact'
    ? value >= 1000000 
      ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000 
      ? `${(value / 1000).toFixed(1)}K`
      : value.toString()
    : value.toLocaleString()

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <div className="p-2 bg-primary-50 rounded-lg">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-2">{formattedValue}</div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          {trend >= 0 ? (
            <>
              <ArrowUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600">+{trend}%</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-4 h-4 text-red-500" />
              <span className="text-red-600">{trend}%</span>
            </>
          )}
          {trendLabel && <span className="text-slate-500 ml-1">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}





