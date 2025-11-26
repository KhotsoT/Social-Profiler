'use client';

import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CurrencySelectorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencySelector({ className = '', showLabel = true, size = 'md' }: CurrencySelectorProps) {
  const { currencies, selectedCurrency, setSelectedCurrency, isLoading } = useCurrency();

  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-2 px-3',
    lg: 'text-base py-3 px-4',
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded h-10 w-24 ${className}`} />
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <label htmlFor="currency-selector" className="text-sm text-gray-600 dark:text-gray-400">
          Currency:
        </label>
      )}
      <select
        id="currency-selector"
        value={selectedCurrency}
        onChange={(e) => setSelectedCurrency(e.target.value)}
        className={`
          ${sizeClasses[size]}
          rounded-lg border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-white
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          cursor-pointer transition-colors
        `}
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} - {currency.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Compact version for navbar
// Symbol lookup for display - guaranteed correct symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'ZAR': 'R', 'EUR': '€', 'GBP': '£', 'NGN': '₦', 
  'KES': 'KSh', 'AED': 'د.إ', 'AUD': 'A$', 'BRL': 'R$', 'CAD': 'C$',
  'GHS': 'GH₵', 'INR': '₹', 'JPY': '¥', 'CNY': '¥',
};

export function getSymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export function CurrencySelectorCompact({ className = '' }: { className?: string }) {
  const { currencies, selectedCurrency, setSelectedCurrency } = useCurrency();

  return (
    <select
      value={selectedCurrency}
      onChange={(e) => setSelectedCurrency(e.target.value)}
      className={`
        text-sm py-1.5 px-2 rounded-md
        bg-transparent border border-gray-300 dark:border-gray-600
        text-gray-700 dark:text-gray-300
        hover:border-emerald-500 focus:ring-1 focus:ring-emerald-500
        cursor-pointer transition-colors
        ${className}
      `}
      title="Select display currency"
    >
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {getSymbol(currency.code)} {currency.code}
        </option>
      ))}
    </select>
  );
}

// Display component for showing amounts
interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  showOriginal?: boolean;
  originalAmount?: number;
  originalCurrency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function CurrencyDisplay({
  amount,
  currency,
  showOriginal = false,
  originalAmount,
  originalCurrency,
  className = '',
  size = 'md',
}: CurrencyDisplayProps) {
  const { formatAmount, selectedCurrency } = useCurrency();
  
  const displayCurrency = currency || selectedCurrency;
  const formatted = formatAmount(amount, displayCurrency);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {formatted}
      {showOriginal && originalAmount !== undefined && originalCurrency && originalCurrency !== displayCurrency && (
        <span className="text-xs text-gray-500 ml-1">
          ({formatAmount(originalAmount, originalCurrency)})
        </span>
      )}
    </span>
  );
}

export default CurrencySelector;

