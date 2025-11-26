import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { CurrencyPrompt } from '@/components/CurrencyPrompt'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'CreatorPay - Global Influencer Marketing Platform',
  description: 'Connect global brands with local audiences. Post and get paid - the easiest way for creators to monetize their influence.',
  keywords: ['influencer marketing', 'social media', 'creator economy', 'campaign management', 'global marketing'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <CurrencyProvider>
            <Navigation />
            <main>{children}</main>
            <CurrencyPrompt />
          </CurrencyProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
