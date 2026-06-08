'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/onboard', label: 'Health Check' },
  { href: '/planner', label: 'Debt Planner' },
  { href: '/tracker', label: 'Budget' },
  { href: '/advisor', label: 'AI Advisor' },
]

export default function Navbar() {
  const path = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-[#262626] bg-[#0a0a0a]/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[#f59e0b] text-xl font-bold tracking-tight">FinFix</span>
          <span className="text-[#737373] text-sm font-medium">India</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                path.startsWith(item.href)
                  ? 'bg-[#262626] text-[#e5e5e5]'
                  : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-[#1a1a1a]'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/onboard"
          className="bg-[#f59e0b] text-black text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#d97706] transition-colors"
        >
          Check My Health
        </Link>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-[#262626] px-4 py-2 flex gap-2 overflow-x-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors',
              path.startsWith(item.href)
                ? 'bg-[#262626] text-[#e5e5e5]'
                : 'text-[#737373]'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  )
}
