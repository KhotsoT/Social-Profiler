'use client';

import React from 'react';
import { MapPin, X, Check, Loader2, Globe } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

export function CurrencyPrompt() {
  const { 
    showCurrencyPrompt, 
    dismissCurrencyPrompt, 
    acceptLocalCurrency, 
    detectedCurrency,
    getCurrencySymbol,
    currencies,
    requestLocationPermission,
    locationStatus,
  } = useCurrency();

  if (!showCurrencyPrompt) return null;

  const currency = detectedCurrency ? currencies.find(c => c.code === detectedCurrency) : null;
  const currencyName = currency?.name || detectedCurrency;

  // Initial state - ask for location permission
  if (!detectedCurrency && locationStatus === 'idle') {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">
                Set your local currency
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                Allow location access to automatically display prices in your local currency, or choose manually.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={requestLocationPermission}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors w-full"
                >
                  <MapPin className="w-4 h-4" />
                  Use my location
                </button>
                <button
                  onClick={dismissCurrencyPrompt}
                  className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors border border-slate-600 rounded-lg hover:border-slate-500"
                >
                  I'll choose manually
                </button>
              </div>
            </div>
            <button
              onClick={dismissCurrencyPrompt}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <Style />
      </div>
    );
  }

  // Loading state
  if (locationStatus === 'requesting') {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-white font-medium">Detecting your location...</h4>
              <p className="text-sm text-slate-400">Please allow location access when prompted</p>
            </div>
          </div>
        </div>
        <Style />
      </div>
    );
  }

  // Location denied - show manual selection or fallback
  if (locationStatus === 'denied' && detectedCurrency) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">
                Location access denied
              </h4>
              <p className="text-sm text-slate-400 mb-3">
                Based on your timezone, we think you might use {getCurrencySymbol(detectedCurrency)} {currencyName}. Is this correct?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={acceptLocalCurrency}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Yes, use {detectedCurrency}
                </button>
                <button
                  onClick={dismissCurrencyPrompt}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Keep USD
                </button>
              </div>
            </div>
            <button
              onClick={dismissCurrencyPrompt}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <Style />
      </div>
    );
  }

  // Currency detected (from location) - confirm
  if (detectedCurrency && locationStatus === 'granted') {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
        <div className="bg-slate-800 rounded-xl shadow-2xl border border-emerald-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Currency set to {detectedCurrency}</h4>
              <p className="text-sm text-slate-400">Prices will display in {getCurrencySymbol(detectedCurrency)} {currencyName}</p>
            </div>
            <button
              onClick={dismissCurrencyPrompt}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <Style />
      </div>
    );
  }

  return null;
}

function Style() {
  return (
    <style jsx>{`
      @keyframes slideUp {
        from { 
          opacity: 0; 
          transform: translateY(20px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      .animate-slideUp {
        animation: slideUp 0.3s ease-out;
      }
    `}</style>
  );
}

export default CurrencyPrompt;
