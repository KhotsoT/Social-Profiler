'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, TrendingUp, Users, Globe, Sparkles, Plus, 
  ArrowRight, Check, DollarSign, Zap, Shield, 
  Play, ChevronRight, Star
} from 'lucide-react'
import InfluencerSearch from '@/components/InfluencerSearch'
import InfluencerGrid from '@/components/InfluencerGrid'
import { Influencer, SearchFilters } from '@/types/influencer'
import { api, User } from '@/lib/api'
import { useCurrency } from '@/contexts/CurrencyContext'

// Exchange rates relative to USD for demo values
const DEMO_RATES: Record<string, number> = {
  'USD': 1, 'ZAR': 18.5, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1550,
  'KES': 153, 'AED': 3.67, 'AUD': 1.53, 'BRL': 4.97, 'CAD': 1.36,
  'GHS': 14.5, 'INR': 83.5, 'JPY': 149, 'CNY': 7.24,
}

export default function Home() {
  const router = useRouter()
  const { selectedCurrency, getCurrencySymbol } = useCurrency()
  
  // Convert demo amounts to selected currency
  const convertAmount = (usdAmount: number): string => {
    const rate = DEMO_RATES[selectedCurrency] || 1
    const converted = usdAmount * rate
    const symbol = getCurrencySymbol(selectedCurrency)
    
    if (converted >= 1000000) {
      return `${symbol}${(converted / 1000000).toFixed(1)}M+`
    }
    if (converted >= 1000) {
      return `${symbol}${Math.round(converted).toLocaleString()}`
    }
    return `${symbol}${converted.toFixed(0)}`
  }
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const storedUser = api.getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }
    loadTopInfluencers()
  }, [])

  const loadTopInfluencers = async () => {
    setLoading(true)
    try {
      const data = await api.discoverInfluencers(undefined, 8)
      setInfluencers(data.influencers || [])
    } catch (err: any) {
      console.error('Failed to load influencers:', err)
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
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm mb-8">
                <Globe className="w-4 h-4" />
                <span>Connecting Global Brands to Local Audiences</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Where Creators
                <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Get Paid
                </span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 max-w-xl">
                The global influencer marketplace. Post content, track your earnings, 
                and get paid in your local currency. It's never been this easy.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Earning Today
                </Link>
                <Link
                  href="/campaigns/new"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Launch a Campaign
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-12 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  <span className="text-white font-semibold">1,000+</span> creators earning globally
                </div>
              </div>
            </div>

            {/* Right side - Stats/Visual */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Earnings card */}
                <div className="absolute -top-4 -left-4 bg-white rounded-2xl shadow-2xl p-6 animate-float">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">This Month</p>
                      <p className="text-2xl font-bold text-slate-900">{convertAmount(12450)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+23% from last month</span>
                  </div>
                </div>

                {/* Main visual card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <Globe className="w-8 h-8 text-emerald-400 mb-3" />
                      <p className="text-3xl font-bold text-white">50+</p>
                      <p className="text-sm text-slate-400">Countries</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <Users className="w-8 h-8 text-teal-400 mb-3" />
                      <p className="text-3xl font-bold text-white">10K+</p>
                      <p className="text-sm text-slate-400">Creators</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <Zap className="w-8 h-8 text-yellow-400 mb-3" />
                      <p className="text-3xl font-bold text-white">500+</p>
                      <p className="text-sm text-slate-400">Campaigns</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <DollarSign className="w-8 h-8 text-green-400 mb-3" />
                      <p className="text-3xl font-bold text-white">{convertAmount(2500000)}</p>
                      <p className="text-sm text-slate-400">Paid Out</p>
                    </div>
                  </div>
                </div>

                {/* Notification card */}
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-2xl p-4 animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Payment Received!</p>
                      <p className="text-xs text-slate-500">From Nike Campaign</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How CreatorPay Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Whether you're a creator looking to monetize or a brand seeking reach, 
              we make the connection seamless.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Creators */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                For Creators
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Post & Get Paid</h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Connect Your Socials', desc: 'Link your Instagram, TikTok, YouTube in seconds' },
                  { step: '2', title: 'Get Matched', desc: 'Receive campaign offers that fit your niche' },
                  { step: '3', title: 'Create & Post', desc: 'Make amazing content for brands you love' },
                  { step: '4', title: 'Get Paid', desc: 'Receive payments in your local currency' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 mt-8 text-emerald-600 font-semibold hover:text-emerald-700"
              >
                Start earning
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* For Brands */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                For Brands
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Launch in 5 Minutes</h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Set Your Budget', desc: 'Choose how much you want to spend' },
                  { step: '2', title: 'Target Your Audience', desc: 'Pick regions, demographics, and niches' },
                  { step: '3', title: 'Review Creators', desc: 'See matched creators with real analytics' },
                  { step: '4', title: 'Go Live', desc: 'Launch your campaign and track results' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 mt-8 text-slate-900 font-semibold hover:text-slate-700"
              >
                Create a campaign
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose CreatorPay?
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Built for the global creator economy with features that matter.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: 'Global Reach', desc: 'Connect with brands and creators across 50+ countries', color: 'emerald' },
              { icon: DollarSign, title: 'Local Currency', desc: 'Get paid in your currency - ZAR, USD, EUR, GBP & more', color: 'teal' },
              { icon: Shield, title: 'Secure Payments', desc: 'Protected transactions with escrow and dispute resolution', color: 'blue' },
              { icon: TrendingUp, title: 'True Analytics', desc: 'Real follower counts with cross-platform deduplication', color: 'purple' },
              { icon: Zap, title: 'Instant Matching', desc: 'AI-powered matching between brands and creators', color: 'yellow' },
              { icon: Star, title: '15% Fee Only', desc: 'Pay per campaign, no subscriptions or hidden fees', color: 'pink' },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-emerald-500/50 transition-colors">
                <div className={`w-12 h-12 bg-${feature.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Discover Creators Section */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Discover Creators</h2>
              <p className="text-slate-600">Find the perfect creators for your next campaign</p>
            </div>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              <Search className="w-4 h-4" />
              {showSearch ? 'Hide Search' : 'Search Creators'}
            </button>
          </div>

          {/* Collapsible Search */}
          {showSearch && (
            <div className="mb-8 animate-slideDown">
              <InfluencerSearch onSearch={handleSearch} loading={loading} />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
              {error}
            </div>
          )}

          {/* Influencer Grid */}
          <InfluencerGrid 
            influencers={influencers} 
            loading={loading}
            onInfluencerClick={handleInfluencerClick}
          />

          {influencers.length > 0 && (
            <div className="text-center mt-8">
              <Link
                href="/influencers"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                View All Creators
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Influence Into Income?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands of creators already earning on CreatorPay. 
            Free to sign up, only pay when you get paid.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-600 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Get Started Free
            </Link>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-700 text-white rounded-xl font-semibold text-lg hover:bg-emerald-800 transition-all"
            >
              Launch a Campaign
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">CreatorPay</span>
            </div>
            <p className="text-sm">
              © 2024 CreatorPay. Connecting global brands to local audiences.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </main>
  )
}
