'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Download } from 'lucide-react'
import { api } from '@/lib/api'

export default function ImportInfluencersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [csvContent, setCsvContent] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvContent(text)
    }
    reader.readAsText(file)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    if (text.includes(',')) {
      setCsvContent(text)
    }
  }

  const parseCSV = (csv: string): any[] => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h.includes('name'))
    const emailIdx = headers.findIndex(h => h.includes('email'))
    const platformIdx = headers.findIndex(h => h.includes('platform'))
    const usernameIdx = headers.findIndex(h => h.includes('username') || h.includes('handle'))
    const followersIdx = headers.findIndex(h => h.includes('follower'))
    const followingIdx = headers.findIndex(h => h.includes('following'))
    const postsIdx = headers.findIndex(h => h.includes('post'))
    const engagementIdx = headers.findIndex(h => h.includes('engagement'))

    const influencers: any[] = []
    const influencerMap = new Map<string, any>()

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      
      if (values.length < 2) continue

      const name = nameIdx >= 0 ? values[nameIdx] : values[0]
      const email = emailIdx >= 0 ? values[emailIdx] : ''
      const platform = platformIdx >= 0 ? values[platformIdx] : 'instagram'
      const username = usernameIdx >= 0 ? values[usernameIdx] : values[1]

      if (!name || !username) continue

      // Get or create influencer
      const key = name.toLowerCase()
      if (!influencerMap.has(key)) {
        influencerMap.set(key, {
          name,
          email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          socialAccounts: [],
        })
      }

      const influencer = influencerMap.get(key)
      influencer.socialAccounts.push({
        platform: platform.toLowerCase(),
        username,
        followerCount: followersIdx >= 0 ? parseInt(values[followersIdx]) || 0 : 0,
        followingCount: followingIdx >= 0 ? parseInt(values[followingIdx]) || 0 : 0,
        postCount: postsIdx >= 0 ? parseInt(values[postsIdx]) || 0 : 0,
        engagementRate: engagementIdx >= 0 ? parseFloat(values[engagementIdx]) || 0 : 0,
        verified: false,
      })
    }

    return Array.from(influencerMap.values())
  }

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError('Please paste CSV data or upload a file')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const influencers = parseCSV(csvContent)
      
      if (influencers.length === 0) {
        setError('No valid influencers found in CSV. Please check the format.')
        setLoading(false)
        return
      }

      // Import influencers one by one
      let successCount = 0
      let errorCount = 0

      for (const influencer of influencers) {
        try {
          await api.createInfluencer(influencer)
          successCount++
        } catch (err: any) {
          console.error(`Failed to import ${influencer.name}:`, err)
          errorCount++
        }
      }

      setSuccess(
        `Successfully imported ${successCount} influencer(s). ` +
        (errorCount > 0 ? `${errorCount} failed.` : '')
      )
      setCsvContent('')

      // Redirect after a moment
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to import influencers')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Name,Email,Platform,Username,Followers,Following,Posts,Engagement Rate
Mihlali Ndamase,mihlali@example.com,instagram,mihlalii_n,2400000,1436,2181,3.5
John Doe,john@example.com,twitter,johndoe,50000,2000,500,2.8`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'influencers_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Import Influencers</h1>
          <p className="text-slate-600 mb-8">
            Import multiple influencers from a CSV file. Perfect for bulk data entry when APIs are limited.
          </p>

          {/* Download Template */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">CSV Format</h3>
                <p className="text-sm text-blue-700">
                  Download a template to see the required format
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Download Template</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload CSV File
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-slate-500">or paste CSV data below</span>
            </div>
          </div>

          {/* CSV Text Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              CSV Data
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste CSV data here or upload a file above. Format: Name,Email,Platform,Username,Followers,Following,Posts,Engagement Rate"
              className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Format Info */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-2">CSV Format:</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Required columns:</strong> Name, Platform, Username</p>
              <p><strong>Optional columns:</strong> Email, Followers, Following, Posts, Engagement Rate</p>
              <p><strong>Platforms:</strong> instagram, twitter, tiktok, facebook, youtube, linkedin</p>
              <p className="mt-2 text-xs text-slate-500">
                Multiple accounts per influencer: Add multiple rows with the same name but different platforms
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !csvContent.trim()}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Importing...' : 'Import Influencers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



