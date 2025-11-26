'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Wallet, TrendingUp, DollarSign, Clock, 
  ArrowUpRight, ArrowDownRight, Eye, Users,
  Calendar, CheckCircle, AlertCircle, BarChart3,
  CreditCard, ArrowRight, Sparkles
} from 'lucide-react'
import { api, Wallet as WalletType, Transaction, Campaign } from '@/lib/api'
import { useCurrency } from '@/contexts/CurrencyContext'
import { CurrencyDisplay } from '@/components/CurrencySelector'
import { Skeleton } from '@/components/LoadingStates'

export default function DashboardPage() {
  const { formatAmount, selectedCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState({
    totalEarned: 0,
    thisMonth: 0,
    pendingPayments: 0,
    completedCampaigns: 0,
  })

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Load all data in parallel
        const [walletRes, transactionsRes, campaignsRes] = await Promise.allSettled([
          api.getWallet(selectedCurrency),
          api.getTransactions({ limit: 5 }),
          api.getCampaigns({ status: 'active', limit: 5 }),
        ])

        if (walletRes.status === 'fulfilled' && walletRes.value.success) {
          setWallet(walletRes.value.data.wallet)
          setStats(prev => ({
            ...prev,
            totalEarned: walletRes.value.data.wallet.totalEarned,
            pendingPayments: walletRes.value.data.wallet.pendingBalance,
          }))
        }

        if (transactionsRes.status === 'fulfilled' && transactionsRes.value.success) {
          setTransactions(transactionsRes.value.data.transactions)
        }

        if (campaignsRes.status === 'fulfilled' && campaignsRes.value.success) {
          setActiveCampaigns(campaignsRes.value.data.campaigns)
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [selectedCurrency])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return <ArrowUpRight className="w-4 h-4 text-emerald-500" />
      case 'withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-orange-500" />
      case 'bonus':
        return <Sparkles className="w-4 h-4 text-purple-500" />
      default:
        return <DollarSign className="w-4 h-4 text-slate-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      active: 'bg-blue-100 text-blue-700',
    }
    return styles[status] || 'bg-slate-100 text-slate-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back! Here's your earnings overview.</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Link
              href="/wallet/withdraw"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              <CreditCard className="w-4 h-4" />
              Withdraw
            </Link>
            <Link
              href="/campaigns"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600"
            >
              <Eye className="w-4 h-4" />
              View Campaigns
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Available Balance */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">Available</span>
            </div>
            <p className="text-3xl font-bold">
              {wallet ? formatAmount(wallet.availableBalance, selectedCurrency) : formatAmount(0)}
            </p>
            <p className="text-sm text-white/80 mt-1">Ready to withdraw</p>
          </div>

          {/* Pending Balance */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Pending</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {wallet ? formatAmount(wallet.pendingBalance, selectedCurrency) : formatAmount(0)}
            </p>
            <p className="text-sm text-slate-500 mt-1">Processing</p>
          </div>

          {/* Total Earned */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-emerald-600 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                12%
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {wallet ? formatAmount(wallet.totalEarned, selectedCurrency) : formatAmount(0)}
            </p>
            <p className="text-sm text-slate-500 mt-1">Total lifetime earnings</p>
          </div>

          {/* Active Campaigns */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{activeCampaigns.length}</p>
            <p className="text-sm text-slate-500 mt-1">Active campaigns</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
              <Link
                href="/wallet/transactions"
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 capitalize">{tx.type}</p>
                        <p className="text-sm text-slate-500">{tx.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.type === 'withdrawal' ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {tx.type === 'withdrawal' ? '-' : '+'}
                        {formatAmount(tx.amount, tx.currencyCode)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600">No transactions yet</p>
                <p className="text-sm text-slate-400 mt-1">Start earning by joining campaigns</p>
              </div>
            )}
          </div>

          {/* Active Campaigns */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Active Campaigns</h2>
              <Link
                href="/campaigns"
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {activeCampaigns.length > 0 ? (
              <div className="space-y-4">
                {activeCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="block p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">{campaign.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                          {campaign.description || 'No description'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                      {campaign.formattedBudget && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {campaign.formattedBudget}
                        </span>
                      )}
                      {campaign.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Ends {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      )}
                      {campaign.isGlobal && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Sparkles className="w-4 h-4" />
                          Global
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600">No active campaigns</p>
                <p className="text-sm text-slate-400 mt-1">Check available opportunities</p>
                <Link
                  href="/campaigns/discover"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                >
                  <Sparkles className="w-4 h-4" />
                  Discover Campaigns
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ready to Earn More?</h2>
              <p className="text-white/80">
                Complete your profile and connect more social accounts to get better campaign matches.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/profile"
                className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors"
              >
                Update Profile
              </Link>
              <Link
                href="/influencers/connect"
                className="px-6 py-3 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl font-medium transition-colors"
              >
                Connect Accounts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

