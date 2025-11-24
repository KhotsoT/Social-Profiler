'use client'

import { Users, TrendingUp, BarChart3, Target } from 'lucide-react'

interface StatsOverviewProps {
  stats: {
    totalInfluencers: number
    totalTrueFollowers: number
    averageEngagement: number
    topCategories: string[]
  }
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      label: 'Total Influencers',
      value: stats.totalInfluencers.toLocaleString() || '0',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'True Followers',
      value: stats.totalTrueFollowers.toLocaleString() || '0',
      icon: Target,
      color: 'bg-green-500',
    },
    {
      label: 'Avg Engagement',
      value: `${stats.averageEngagement.toFixed(1)}%` || '0%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      label: 'Active Categories',
      value: stats.topCategories.length.toString() || '0',
      icon: BarChart3,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}





