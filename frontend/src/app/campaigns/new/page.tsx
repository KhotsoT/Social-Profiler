'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, ArrowRight, Calendar, Check, Globe, 
  MapPin, Sparkles, Target, Users, Zap, 
  Image as ImageIcon, Video, FileText, Mic
} from 'lucide-react'
import { api, Country } from '@/lib/api'
import { useCurrency } from '@/contexts/CurrencyContext'
import { LoadingButton } from '@/components/LoadingStates'

// Campaign templates for quick start
const CAMPAIGN_TEMPLATES = [
  { 
    id: 'product-launch', 
    name: 'Product Launch', 
    icon: Zap,
    description: 'Launch a new product with maximum impact',
    defaultBudget: 5000,
    suggestedDuration: 30,
  },
  { 
    id: 'brand-awareness', 
    name: 'Brand Awareness', 
    icon: Target,
    description: 'Build recognition and reach new audiences',
    defaultBudget: 10000,
    suggestedDuration: 60,
  },
  { 
    id: 'seasonal', 
    name: 'Seasonal Campaign', 
    icon: Calendar,
    description: 'Capitalize on holidays or seasonal trends',
    defaultBudget: 7500,
    suggestedDuration: 14,
  },
  { 
    id: 'custom', 
    name: 'Custom Campaign', 
    icon: Sparkles,
    description: 'Start from scratch with full control',
    defaultBudget: 0,
    suggestedDuration: 30,
  },
]

// Content types
const CONTENT_TYPES = [
  { id: 'photo', name: 'Photo Posts', icon: ImageIcon, rate: 1.0 },
  { id: 'video', name: 'Video Content', icon: Video, rate: 1.5 },
  { id: 'story', name: 'Stories/Reels', icon: Sparkles, rate: 0.8 },
  { id: 'blog', name: 'Blog/Article', icon: FileText, rate: 2.0 },
  { id: 'podcast', name: 'Podcast Mention', icon: Mic, rate: 2.5 },
]

// Regions/Countries
const REGIONS = [
  { id: 'africa', name: 'Africa', emoji: '🌍' },
  { id: 'europe', name: 'Europe', emoji: '🇪🇺' },
  { id: 'north-america', name: 'North America', emoji: '🌎' },
  { id: 'south-america', name: 'South America', emoji: '🌎' },
  { id: 'asia', name: 'Asia', emoji: '🌏' },
  { id: 'oceania', name: 'Oceania', emoji: '🌏' },
]

type Step = 1 | 2 | 3 | 4

export default function NewCampaignPage() {
  const router = useRouter()
  const { currencies, selectedCurrency, formatAmount, getCurrencySymbol } = useCurrency()
  
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  
  // Form state
  const [template, setTemplate] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    budgetCurrency: selectedCurrency,
    startDate: '',
    endDate: '',
    targetCountries: [] as string[],
    targetRegions: [] as string[],
    contentTypes: [] as string[],
    isGlobal: false,
  })

  // Load countries
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await api.getBrandCountries()
        if (response.success) {
          setCountries(response.data.countries)
        }
      } catch (err) {
        console.error('Failed to load countries:', err)
      }
    }
    loadCountries()
  }, [])

  // Update currency when user changes it globally
  useEffect(() => {
    setFormData(prev => ({ ...prev, budgetCurrency: selectedCurrency }))
  }, [selectedCurrency])

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    setTemplate(templateId)
    const selected = CAMPAIGN_TEMPLATES.find(t => t.id === templateId)
    if (selected && selected.defaultBudget > 0) {
      setFormData(prev => ({ 
        ...prev, 
        budget: selected.defaultBudget.toString(),
      }))
    }
    setStep(2)
  }

  // Region toggle handler
  const handleRegionToggle = (regionId: string) => {
    setFormData(prev => ({
      ...prev,
      targetRegions: prev.targetRegions.includes(regionId)
        ? prev.targetRegions.filter(r => r !== regionId)
        : [...prev.targetRegions, regionId],
      isGlobal: prev.targetRegions.length > 0,
    }))
  }

  // Content type toggle
  const handleContentTypeToggle = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(typeId)
        ? prev.contentTypes.filter(t => t !== typeId)
        : [...prev.contentTypes, typeId],
    }))
  }

  // Calculate estimated reach based on budget
  const estimatedReach = () => {
    const budget = parseFloat(formData.budget) || 0
    // Rough estimate: $1 = 100 impressions, varies by region
    const baseReach = budget * 100
    const regionMultiplier = formData.targetRegions.length > 3 ? 0.8 : 1.2
    return Math.round(baseReach * regionMultiplier)
  }

  // Calculate estimated creators
  const estimatedCreators = () => {
    const budget = parseFloat(formData.budget) || 0
    // Rough estimate based on average creator rates
    const avgCreatorCost = 500
    return Math.max(1, Math.round(budget / avgCreatorCost))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!formData.name.trim()) {
      setError('Campaign name is required')
      return
    }

    setLoading(true)

    try {
      const response = await api.createCampaign({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        budgetCurrency: formData.budgetCurrency,
        targetCountries: formData.targetCountries.length > 0 ? formData.targetCountries : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isGlobal: formData.isGlobal || formData.targetRegions.length > 1,
      })

      if (response.success && response.data) {
        router.push(`/campaigns/${response.data.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign')
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return template !== null
      case 2: return formData.name.trim().length > 0
      case 3: return formData.targetRegions.length > 0
      case 4: return parseFloat(formData.budget) > 0
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Progress Header */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-lg border-b border-emerald-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => step > 1 ? setStep((step - 1) as Step) : router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{step > 1 ? 'Back' : 'Cancel'}</span>
            </button>
            <span className="text-sm text-slate-500">Step {step} of 4</span>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 animate-shake">
            {error}
          </div>
        )}

        {/* Step 1: Choose Template */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                Let's Create Something Magical ✨
              </h1>
              <p className="text-lg text-slate-600">
                Choose a template to get started, or create from scratch
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CAMPAIGN_TEMPLATES.map((t) => {
                const Icon = t.icon
                const isSelected = template === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateSelect(t.id)}
                    className={`
                      relative p-6 rounded-2xl border-2 text-left transition-all duration-300
                      hover:shadow-lg hover:-translate-y-1
                      ${isSelected 
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-emerald-100' 
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center mb-4
                      ${isSelected 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' 
                        : 'bg-slate-100 text-slate-600'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{t.name}</h3>
                    <p className="text-slate-600">{t.description}</p>
                    {t.defaultBudget > 0 && (
                      <p className="mt-3 text-sm text-emerald-600 font-medium">
                        Suggested budget: {formatAmount(t.defaultBudget)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Campaign Details */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Tell Us About Your Campaign
              </h1>
              <p className="text-lg text-slate-600">
                The basics to get your message out there
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="e.g., Summer Product Launch 2024"
                  autoFocus
                />
              </div>

              {/* Description with AI suggestion */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Brief
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                  placeholder="Describe what you want creators to communicate about your brand..."
                />
                <p className="mt-2 text-sm text-slate-500">
                  💡 Tip: Be specific about your goals and target audience for better creator matches
                </p>
              </div>

              {/* Content Types */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Content Types
                </label>
                <div className="flex flex-wrap gap-3">
                  {CONTENT_TYPES.map((type) => {
                    const Icon = type.icon
                    const isSelected = formData.contentTypes.includes(type.id)
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleContentTypeToggle(type.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all
                          ${isSelected 
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                            : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {type.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate}
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(3)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Target Regions */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Where Should We Reach? 🌍
              </h1>
              <p className="text-lg text-slate-600">
                Select the regions where you want to connect with audiences
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Global toggle */}
              <button
                onClick={() => {
                  const allRegions = REGIONS.map(r => r.id)
                  setFormData(prev => ({
                    ...prev,
                    targetRegions: prev.targetRegions.length === allRegions.length ? [] : allRegions,
                    isGlobal: prev.targetRegions.length !== allRegions.length,
                  }))
                }}
                className={`
                  w-full mb-6 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all
                  ${formData.targetRegions.length === REGIONS.length 
                    ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50' 
                    : 'border-dashed border-slate-300 hover:border-emerald-300'
                  }
                `}
              >
                <Globe className={`w-6 h-6 ${formData.targetRegions.length === REGIONS.length ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-lg font-medium ${formData.targetRegions.length === REGIONS.length ? 'text-emerald-700' : 'text-slate-600'}`}>
                  Go Global - All Regions
                </span>
                {formData.targetRegions.length === REGIONS.length && (
                  <Check className="w-5 h-5 text-emerald-600" />
                )}
              </button>

              {/* Region Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {REGIONS.map((region) => {
                  const isSelected = formData.targetRegions.includes(region.id)
                  return (
                    <button
                      key={region.id}
                      onClick={() => handleRegionToggle(region.id)}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all
                        ${isSelected 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-slate-200 hover:border-emerald-300'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className="text-3xl mb-2 block">{region.emoji}</span>
                      <span className={`font-medium ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {region.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              {formData.targetRegions.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">
                      {formData.targetRegions.length === REGIONS.length 
                        ? 'Global Campaign' 
                        : `${formData.targetRegions.length} region${formData.targetRegions.length > 1 ? 's' : ''} selected`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Budget & Review */}
        {step === 4 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Set Your Budget 💰
              </h1>
              <p className="text-lg text-slate-600">
                CreatorPay takes just 15% - you keep the magic
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Budget Input */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Campaign Budget</h2>
                
                {/* Currency Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.budgetCurrency}
                    onChange={(e) => setFormData({ ...formData, budgetCurrency: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Total Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
                      {getCurrencySymbol(formData.budgetCurrency)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 text-3xl font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[1000, 5000, 10000, 25000, 50000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setFormData({ ...formData, budget: amount.toString() })}
                      className={`
                        px-4 py-2 rounded-lg border transition-all
                        ${formData.budget === amount.toString() 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                        }
                      `}
                    >
                      {formatAmount(amount, formData.budgetCurrency)}
                    </button>
                  ))}
                </div>

                {/* Fee breakdown */}
                {parseFloat(formData.budget) > 0 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Creator Payments</span>
                      <span>{formatAmount(parseFloat(formData.budget) * 0.85, formData.budgetCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee (15%)</span>
                      <span>{formatAmount(parseFloat(formData.budget) * 0.15, formData.budgetCurrency)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatAmount(parseFloat(formData.budget), formData.budgetCurrency)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Campaign Summary */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl p-8 text-white">
                <h2 className="text-xl font-semibold mb-6">Campaign Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/20">
                    <span className="text-white/80">Campaign</span>
                    <span className="font-semibold">{formData.name || 'Untitled'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-4 border-b border-white/20">
                    <span className="text-white/80">Template</span>
                    <span className="font-semibold capitalize">{template?.replace('-', ' ')}</span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-white/20">
                    <span className="text-white/80">Regions</span>
                    <span className="font-semibold">
                      {formData.targetRegions.length === REGIONS.length 
                        ? 'Global' 
                        : `${formData.targetRegions.length} selected`
                      }
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-white/20">
                    <span className="text-white/80">Content Types</span>
                    <span className="font-semibold">{formData.contentTypes.length || 'Any'}</span>
                  </div>

                  {parseFloat(formData.budget) > 0 && (
                    <>
                      <div className="flex justify-between items-center pb-4 border-b border-white/20">
                        <span className="text-white/80">Est. Reach</span>
                        <span className="font-semibold">{estimatedReach().toLocaleString()}+</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-white/80">Est. Creators</span>
                        <span className="font-semibold">{estimatedCreators()}-{estimatedCreators() * 2}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Launch Button */}
                <div className="mt-8">
                  <LoadingButton
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!canProceed()}
                    className="w-full py-4 bg-white text-emerald-600 rounded-xl font-bold text-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Launch Campaign
                  </LoadingButton>
                </div>
              </div>
            </div>

            <div className="flex justify-start mt-8">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
