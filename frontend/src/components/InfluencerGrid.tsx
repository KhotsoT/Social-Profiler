'use client'

import { Influencer } from '@/types/influencer'
import { Instagram, Twitter, Youtube, Linkedin, Facebook, Music } from 'lucide-react'

interface InfluencerGridProps {
  influencers: Influencer[]
  loading: boolean
  onInfluencerClick?: (id: string) => void
}

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

export default function InfluencerGrid({ influencers, loading, onInfluencerClick }: InfluencerGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-16 w-16 bg-slate-200 rounded-full mb-4"></div>
            <div className="h-4 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (influencers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg">No influencers found. Try adjusting your search filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {influencers.map((influencer) => {
        const totalFollowers = influencer.trueFollowerCount || 
          influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0)
        const avgEngagement = influencer.socialAccounts.length > 0
          ? influencer.socialAccounts.reduce((sum, acc) => sum + acc.engagementRate, 0) / influencer.socialAccounts.length
          : 0

        return (
          <div
            key={influencer.id}
            onClick={() => onInfluencerClick?.(influencer.id)}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{influencer.name}</h3>
                <p className="text-sm text-slate-500">@{influencer.socialAccounts[0]?.username || 'unknown'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">True Followers</span>
                  <span className="font-semibold text-slate-900">
                    {totalFollowers.toLocaleString()}
                  </span>
                </div>
                {influencer.trueFollowerCount && (
                  <div className="text-xs text-slate-500">
                    {influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0).toLocaleString()} total across platforms
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Engagement</span>
                <span className="font-semibold text-slate-900">
                  {avgEngagement.toFixed(1)}%
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {influencer.socialAccounts.map((account) => {
                  const Icon = platformIcons[account.platform]
                  return (
                    <div
                      key={account.platform}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-white text-xs ${platformColors[account.platform]}`}
                      title={`${account.platform}: ${account.followerCount.toLocaleString()} followers`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{account.followerCount > 1000 
                        ? `${(account.followerCount / 1000).toFixed(1)}K` 
                        : account.followerCount}</span>
                    </div>
                  )
                })}
              </div>

              {influencer.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-200">
                  {influencer.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                    >
                      {category.replace('tier-', '').replace('engagement-', '').replace('platform-', '')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}



