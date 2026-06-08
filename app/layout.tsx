import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'FinFix India — Fix Your Finances in 5 Minutes',
  description: 'Free personal finance health check for salaried Indians. Know your debt score, get a debt-free roadmap, and track your monthly budget. No sign-up needed.',
  keywords: 'personal finance india, emi calculator, debt free, salary budget, loan tracker',
  openGraph: {
    title: 'FinFix India — Fix Your Finances in 5 Minutes',
    description: 'Free finance health check. Know exactly where you stand and what to do first.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
