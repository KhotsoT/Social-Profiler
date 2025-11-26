'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, Currency, Country } from '@/lib/api';

interface CurrencyContextType {
  currencies: Currency[];
  countries: Country[];
  selectedCurrency: string;
  setSelectedCurrency: (code: string) => void;
  formatAmount: (amount: number, currencyCode?: string) => string;
  getCurrencySymbol: (code: string) => string;
  isLoading: boolean;
  error: string | null;
  showCurrencyPrompt: boolean;
  dismissCurrencyPrompt: () => void;
  acceptLocalCurrency: () => void;
  detectedCurrency: string | null;
  requestLocationPermission: () => void;
  locationStatus: 'idle' | 'requesting' | 'granted' | 'denied';
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Locale to currency mapping
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  // South Africa
  'en-ZA': 'ZAR', 'af-ZA': 'ZAR', 'zu-ZA': 'ZAR',
  // UK
  'en-GB': 'GBP',
  // Europe
  'de-DE': 'EUR', 'fr-FR': 'EUR', 'es-ES': 'EUR', 'it-IT': 'EUR', 
  'nl-NL': 'EUR', 'pt-PT': 'EUR', 'de-AT': 'EUR', 'fr-BE': 'EUR',
  // Nigeria
  'en-NG': 'NGN', 'yo-NG': 'NGN', 'ha-NG': 'NGN', 'ig-NG': 'NGN',
  // Kenya
  'en-KE': 'KES', 'sw-KE': 'KES',
  // Ghana
  'en-GH': 'GHS',
  // India
  'en-IN': 'INR', 'hi-IN': 'INR',
  // Australia
  'en-AU': 'AUD',
  // Canada
  'en-CA': 'CAD', 'fr-CA': 'CAD',
  // Brazil
  'pt-BR': 'BRL',
  // Japan
  'ja-JP': 'JPY',
  // China
  'zh-CN': 'CNY',
  // UAE
  'ar-AE': 'AED',
  // Default US
  'en-US': 'USD',
};

// Timezone to currency fallback
const TIMEZONE_CURRENCY_MAP: Record<string, string> = {
  'Africa/Johannesburg': 'ZAR',
  'Africa/Lagos': 'NGN',
  'Africa/Nairobi': 'KES',
  'Africa/Accra': 'GHS',
  'Europe/London': 'GBP',
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Amsterdam': 'EUR',
  'Asia/Kolkata': 'INR',
  'Asia/Dubai': 'AED',
  'Asia/Tokyo': 'JPY',
  'Asia/Shanghai': 'CNY',
  'Australia/Sydney': 'AUD',
  'America/Toronto': 'CAD',
  'America/Sao_Paulo': 'BRL',
  'America/New_York': 'USD',
  'America/Los_Angeles': 'USD',
};

// Country code to currency mapping
const COUNTRY_CODE_CURRENCY: Record<string, string> = {
  'ZA': 'ZAR', 'GB': 'GBP', 'NG': 'NGN', 'KE': 'KES', 
  'GH': 'GHS', 'IN': 'INR', 'AU': 'AUD', 'CA': 'CAD',
  'BR': 'BRL', 'JP': 'JPY', 'CN': 'CNY', 'AE': 'AED',
  'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR',
  'NL': 'EUR', 'PT': 'EUR', 'AT': 'EUR', 'BE': 'EUR',
  'US': 'USD', 'EG': 'EGP', 'MA': 'MAD', 'TZ': 'TZS',
  'UG': 'UGX', 'RW': 'RWF', 'ZM': 'ZMW', 'BW': 'BWP',
};

/**
 * Get currency from coordinates using reverse geocoding
 */
async function getCurrencyFromLocation(lat: number, lon: number): Promise<string | null> {
  try {
    // Use free reverse geocoding API
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await response.json();
    const countryCode = data.countryCode;
    
    if (countryCode && COUNTRY_CODE_CURRENCY[countryCode]) {
      return COUNTRY_CODE_CURRENCY[countryCode];
    }
    return null;
  } catch (error) {
    console.error('Failed to get location data:', error);
    return null;
  }
}

/**
 * Detect user's local currency from timezone/locale (fallback)
 */
function detectCurrencyFromTimezone(): string {
  if (typeof window === 'undefined') return 'USD';

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (TIMEZONE_CURRENCY_MAP[timezone]) {
      return TIMEZONE_CURRENCY_MAP[timezone];
    }
    
    // Partial timezone matching
    if (timezone.startsWith('Africa/')) {
      if (timezone.includes('Johannesburg') || timezone.includes('Harare')) return 'ZAR';
      if (timezone.includes('Lagos')) return 'NGN';
      if (timezone.includes('Nairobi')) return 'KES';
      if (timezone.includes('Accra')) return 'GHS';
      return 'ZAR';
    }
    if (timezone.startsWith('Europe/London')) return 'GBP';
    if (timezone.startsWith('Europe/')) return 'EUR';
    if (timezone.startsWith('Australia/')) return 'AUD';
  } catch (e) {
    console.warn('Could not detect timezone');
  }

  // Check locale
  const locale = navigator.language;
  const countryCode = locale.split('-')[1]?.toUpperCase();
  if (countryCode && COUNTRY_CODE_CURRENCY[countryCode]) {
    return COUNTRY_CODE_CURRENCY[countryCode];
  }

  return 'USD';
}

// Default currency data - always available even if API fails
const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 50, minCampaignAmount: 100 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 500, minCampaignAmount: 1000 },
  { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 50, minCampaignAmount: 100 },
  { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 50, minCampaignAmount: 100 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 10000, minCampaignAmount: 50000 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 5000, minCampaignAmount: 10000 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 200, minCampaignAmount: 500 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 50, minCampaignAmount: 100 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 200, minCampaignAmount: 500 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 50, minCampaignAmount: 100 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 500, minCampaignAmount: 1000 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before', decimalPlaces: 2, isActive: true, isPayoutSupported: true, isPaymentSupported: true, minPayoutAmount: 4000, minCampaignAmount: 10000 },
];

// Map API response to our Currency type with fallback symbols
function mapCurrencyResponse(apiCurrencies: any[]): Currency[] {
  const symbolMap: Record<string, string> = {
    'USD': '$', 'ZAR': 'R', 'EUR': '€', 'GBP': '£', 'NGN': '₦', 
    'KES': 'KSh', 'AED': 'د.إ', 'AUD': 'A$', 'BRL': 'R$', 'CAD': 'C$',
    'GHS': 'GH₵', 'INR': '₹', 'JPY': '¥', 'CNY': '¥',
  };
  
  return apiCurrencies.map(c => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol || symbolMap[c.code] || c.code,
    symbolPosition: c.symbol_position || 'before',
    decimalPlaces: c.decimal_places || 2,
    isActive: c.is_active !== false,
    isPayoutSupported: c.is_payout_supported !== false,
    isPaymentSupported: c.is_payment_supported !== false,
    minPayoutAmount: c.min_payout_amount || 50,
    minCampaignAmount: c.min_campaign_amount || 100,
  }));
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCurrency, setSelectedCurrencyState] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCurrencyPrompt, setShowCurrencyPrompt] = useState(false);
  const [detectedCurrency, setDetectedCurrency] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  // Load currencies and countries on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to load from API
        const [currenciesRes, countriesRes] = await Promise.allSettled([
          api.getCurrencies(),
          api.getCountries(),
        ]);

        if (currenciesRes.status === 'fulfilled' && currenciesRes.value.success && currenciesRes.value.data.currencies?.length > 0) {
          const mapped = mapCurrencyResponse(currenciesRes.value.data.currencies);
          setCurrencies(mapped);
        }

        if (countriesRes.status === 'fulfilled' && countriesRes.value.success) {
          setCountries(countriesRes.value.data.countries);
        }

        // Check if user has already set a preference
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('preferredCurrency');
          const hasBeenAsked = localStorage.getItem('currencyPromptDismissed');
          
          if (saved) {
            // User already has a saved preference
            setSelectedCurrencyState(saved);
          } else if (!hasBeenAsked) {
            // Show prompt to ask for location permission
            setShowCurrencyPrompt(true);
            // Default to USD until they choose
            setSelectedCurrencyState('USD');
          }
        }
      } catch (err) {
        console.error('Failed to load currency data:', err);
        setError('Failed to load currency data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const dismissCurrencyPrompt = useCallback(() => {
    setShowCurrencyPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('currencyPromptDismissed', 'true');
    }
  }, []);

  const acceptLocalCurrency = useCallback(() => {
    if (detectedCurrency) {
      setSelectedCurrencyState(detectedCurrency);
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredCurrency', detectedCurrency);
        localStorage.setItem('currencyPromptDismissed', 'true');
      }
    }
    setShowCurrencyPrompt(false);
  }, [detectedCurrency]);

  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      // Geolocation not supported, fall back to timezone
      const fallback = detectCurrencyFromTimezone();
      setDetectedCurrency(fallback);
      return;
    }

    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationStatus('granted');
        const { latitude, longitude } = position.coords;
        
        // Get currency from actual location
        const currency = await getCurrencyFromLocation(latitude, longitude);
        if (currency) {
          setDetectedCurrency(currency);
          setSelectedCurrencyState(currency);
          if (typeof window !== 'undefined') {
            localStorage.setItem('preferredCurrency', currency);
            localStorage.setItem('currencyPromptDismissed', 'true');
          }
          setShowCurrencyPrompt(false);
        } else {
          // Fallback to timezone detection
          const fallback = detectCurrencyFromTimezone();
          setDetectedCurrency(fallback);
        }
      },
      (error) => {
        console.warn('Location permission denied:', error);
        setLocationStatus('denied');
        // Fall back to timezone detection
        const fallback = detectCurrencyFromTimezone();
        setDetectedCurrency(fallback);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const setSelectedCurrency = useCallback((code: string) => {
    setSelectedCurrencyState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredCurrency', code);
    }
  }, []);

  // Guaranteed correct symbols
  const SYMBOL_MAP: Record<string, string> = {
    'USD': '$', 'ZAR': 'R', 'EUR': '€', 'GBP': '£', 'NGN': '₦', 
    'KES': 'KSh', 'AED': 'د.إ', 'AUD': 'A$', 'BRL': 'R$', 'CAD': 'C$',
    'GHS': 'GH₵', 'INR': '₹', 'JPY': '¥', 'CNY': '¥',
  };

  const getCurrencySymbol = useCallback((code: string): string => {
    return SYMBOL_MAP[code] || code;
  }, []);

  const formatAmount = useCallback((amount: number, currencyCode?: string): string => {
    const code = currencyCode || selectedCurrency;
    const symbol = SYMBOL_MAP[code] || code;
    
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${symbol}${formatted}`;
  }, [selectedCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        currencies,
        countries,
        selectedCurrency,
        setSelectedCurrency,
        formatAmount,
        getCurrencySymbol,
        isLoading,
        error,
        showCurrencyPrompt,
        dismissCurrencyPrompt,
        acceptLocalCurrency,
        detectedCurrency,
        requestLocationPermission,
        locationStatus,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

