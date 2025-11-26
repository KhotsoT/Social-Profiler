'use client'

import { Influencer } from '@/types/influencer'
import { Instagram, Twitter, Youtube, Linkedin, Facebook, Music, Users, TrendingUp, Verified, Star } from 'lucide-react'

interface InfluencerGridProps {
  influencers: Influencer[]
  loading: boolean
  onInfluencerClick?: (id: string) => void
}

const platformIcons: Record<string, any> = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  tiktok: Music,
}

// No colored header - keep it clean
const platformColors: Record<string, string> = {
  instagram: 'from-white to-white',
  twitter: 'from-white to-white',
  youtube: 'from-white to-white',
  linkedin: 'from-white to-white',
  facebook: 'from-white to-white',
  tiktok: 'from-white to-white',
}

const platformBgColors: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-pink-400 to-purple-400',
  twitter: 'bg-sky-400',
  youtube: 'bg-red-400',
  linkedin: 'bg-blue-500',
  facebook: 'bg-blue-400',
  tiktok: 'bg-slate-700',
}

// Generate a consistent color based on name - emerald theme with variety
function getAvatarGradient(name: string): string {
  const gradients = [
    'from-emerald-500 to-teal-600',
    'from-teal-500 to-cyan-600',
    'from-green-500 to-emerald-600',
    'from-emerald-600 to-green-700',
    'from-teal-600 to-emerald-700',
    'from-cyan-500 to-teal-600',
    'from-emerald-400 to-teal-500',
    'from-green-600 to-teal-700',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length
  return gradients[index]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export default function InfluencerGrid({ influencers, loading, onInfluencerClick }: InfluencerGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-2xl shadow-lg p-5 animate-pulse">
            <div className="h-14 w-14 bg-slate-700 rounded-full mb-3"></div>
            <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-24 mb-4"></div>
            <div className="h-16 bg-slate-700 rounded-lg mb-4"></div>
            <div className="flex gap-2 mb-4">
              <div className="h-7 w-7 bg-slate-700 rounded-full"></div>
              <div className="h-7 w-7 bg-slate-700 rounded-full"></div>
            </div>
            <div className="flex gap-1.5">
              <div className="h-5 bg-slate-700 rounded-full w-12"></div>
              <div className="h-5 bg-slate-700 rounded-full w-16"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (influencers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-10 h-10 text-slate-400" />
        </div>
        <p className="text-slate-600 text-lg mb-2">No creators found</p>
        <p className="text-slate-400">Try adjusting your search filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {influencers.map((influencer) => {
        const totalFollowers = influencer.trueFollowerCount || 
          influencer.socialAccounts.reduce((sum, acc) => sum + acc.followerCount, 0)
        const avgEngagement = influencer.socialAccounts.length > 0
          ? influencer.socialAccounts.reduce((sum, acc) => sum + acc.engagementRate, 0) / influencer.socialAccounts.length
          : 0
        const primaryPlatform = influencer.socialAccounts[0]?.platform || 'instagram'
        const isVerified = influencer.socialAccounts.some(acc => acc.verified)
        const profileImage = influencer.socialAccounts.find(acc => acc.profileImageUrl)?.profileImageUrl

        return (
            <div
            key={influencer.id}
            onClick={() => onInfluencerClick?.(influencer.id)}
            className="group bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-700 hover:border-emerald-500 hover:-translate-y-1"
          >

            {/* Profile section */}
            <div className="p-5">
              {/* Avatar */}
              <div className="relative inline-block mb-3">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={influencer.name}
                    className="w-14 h-14 rounded-full shadow-sm object-cover bg-slate-100"
                    onError={(e) => {
                      // Fallback to initials on error
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`w-14 h-14 rounded-full shadow-sm bg-gradient-to-br ${getAvatarGradient(influencer.name)} flex items-center justify-center text-white text-base font-semibold ${profileImage ? 'hidden' : ''}`}>
                  {getInitials(influencer.name)}
                </div>
                
                {/* Verified badge */}
                {isVerified && (
                  <div className="absolute -right-0.5 -bottom-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                    <Verified className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="font-semibold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-3">
                {influencer.name}
              </h3>

              {/* Stats row */}
              <div className="flex items-center justify-between mb-4 py-2.5 px-3 bg-slate-700/50 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{formatFollowerCount(totalFollowers)}</p>
                  <p className="text-xs text-slate-400">Followers</p>
                </div>
                <div className="w-px h-8 bg-slate-600"></div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{avgEngagement.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400">Engagement</p>
                </div>
                <div className="w-px h-8 bg-slate-600"></div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{influencer.socialAccounts.length}</p>
                  <p className="text-xs text-slate-400">Platforms</p>
                </div>
              </div>

              {/* Platform icons */}
              <div className="flex items-center gap-1.5 mb-4">
                {influencer.socialAccounts.slice(0, 4).map((account) => {
                  const Icon = platformIcons[account.platform] || Users
                  return (
                    <div
                      key={account.platform}
                      className={`flex items-center justify-center w-7 h-7 rounded-full ${platformBgColors[account.platform] || 'bg-slate-500'} text-white hover:scale-105 transition-transform`}
                      title={`${account.platform}: ${formatFollowerCount(account.followerCount)} followers`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  )
                })}
                {influencer.socialAccounts.length > 4 && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 text-slate-300 text-xs font-medium">
                    +{influencer.socialAccounts.length - 4}
                  </div>
                )}
              </div>

              {/* Categories/Tags */}
              {influencer.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {influencer.categories.slice(0, 3).map((category) => {
                    const cleanCategory = category
                      .replace('tier-', '')
                      .replace('engagement-', '')
                      .replace('platform-', '')
                      .replace('-', ' ')
                    return (
                      <span
                        key={category}
                        className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full capitalize"
                      >
                        {cleanCategory}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
