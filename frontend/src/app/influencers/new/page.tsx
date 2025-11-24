'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { api } from '@/lib/api'

export default function NewInfluencerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    socialAccounts: [
      {
        platform: 'instagram',
        username: '',
        followerCount: '',
        followingCount: '',
        postCount: '',
        engagementRate: '',
        verified: false,
      }
    ],
  })

  const addSocialAccount = () => {
    setFormData({
      ...formData,
      socialAccounts: [
        ...formData.socialAccounts,
        {
          platform: 'instagram',
          username: '',
          followerCount: '',
          followingCount: '',
          postCount: '',
          engagementRate: '',
          verified: false,
        }
      ]
    })
  }

  const removeSocialAccount = (index: number) => {
    setFormData({
      ...formData,
      socialAccounts: formData.socialAccounts.filter((_, i) => i !== index)
    })
  }

  const updateSocialAccount = (index: number, field: string, value: any) => {
    const updated = [...formData.socialAccounts]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, socialAccounts: updated })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Format social accounts for API
      const socialAccounts = formData.socialAccounts
        .filter(acc => acc.username.trim() !== '')
        .map(acc => ({
          platform: acc.platform,
          username: acc.username.trim(),
          platformId: acc.username.trim(), // Use username as platformId if not available
          followerCount: parseInt(acc.followerCount) || 0,
          followingCount: parseInt(acc.followingCount) || 0,
          postCount: parseInt(acc.postCount) || 0,
          engagementRate: parseFloat(acc.engagementRate) || 0,
          verified: acc.verified,
        }))

      if (socialAccounts.length === 0) {
        setError('Please add at least one social media account')
        setLoading(false)
        return
      }

      const result = await api.createInfluencer({
        name: formData.name.trim(),
        email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        socialAccounts,
      })

      // Navigate to the new influencer's detail page
      router.push(`/influencers/${result.id}`)
    } catch (err: any) {
      console.error('Failed to create influencer:', err)
      setError(err.message || 'Failed to create influencer. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Add New Influencer</h1>
          <p className="text-slate-600 mb-8">
            Manually enter influencer data. This is useful when API access is limited.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Mihlali Ndamase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="email@example.com (optional)"
                />
              </div>
            </div>

            {/* Social Accounts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Social Media Accounts</h2>
                <button
                  type="button"
                  onClick={addSocialAccount}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Platform</span>
                </button>
              </div>

              {formData.socialAccounts.map((account, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Account {index + 1}</h3>
                    {formData.socialAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSocialAccount(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Platform *
                      </label>
                      <select
                        required
                        value={account.platform}
                        onChange={(e) => updateSocialAccount(index, 'platform', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="twitter">Twitter</option>
                        <option value="facebook">Facebook</option>
                        <option value="youtube">YouTube</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={account.username}
                        onChange={(e) => updateSocialAccount(index, 'username', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., mihlalii_n"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Followers
                      </label>
                      <input
                        type="number"
                        value={account.followerCount}
                        onChange={(e) => updateSocialAccount(index, 'followerCount', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., 2400000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Following
                      </label>
                      <input
                        type="number"
                        value={account.followingCount}
                        onChange={(e) => updateSocialAccount(index, 'followingCount', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., 1436"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Posts
                      </label>
                      <input
                        type="number"
                        value={account.postCount}
                        onChange={(e) => updateSocialAccount(index, 'postCount', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., 2181"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Engagement Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={account.engagementRate}
                        onChange={(e) => updateSocialAccount(index, 'engagementRate', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., 3.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`verified-${index}`}
                      checked={account.verified}
                      onChange={(e) => updateSocialAccount(index, 'verified', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor={`verified-${index}`} className="text-sm text-slate-700">
                      Verified Account
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Influencer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}



