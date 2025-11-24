'use client'

import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'

interface InfluencerSearchProps {
  onSearch: (filters: any) => void
  loading: boolean
}

export default function InfluencerSearch({ onSearch, loading }: InfluencerSearchProps) {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')
  const [minFollowers, setMinFollowers] = useState('')
  const [maxFollowers, setMaxFollowers] = useState('')
  const [niche, setNiche] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({
      query,
      platform,
      minFollowers: minFollowers ? parseInt(minFollowers) : undefined,
      maxFollowers: maxFollowers ? parseInt(maxFollowers) : undefined,
      niche,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search influencers by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">Twitter</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
            <option value="linkedin">LinkedIn</option>
          </select>

          <input
            type="number"
            placeholder="Min Followers"
            value={minFollowers}
            onChange={(e) => setMinFollowers(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />

          <input
            type="number"
            placeholder="Max Followers"
            value={maxFollowers}
            onChange={(e) => setMaxFollowers(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />

          <input
            type="text"
            placeholder="Niche (e.g., fashion, tech)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </form>
    </div>
  )
}





