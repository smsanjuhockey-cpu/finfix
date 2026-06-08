import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#262626] mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#f59e0b] font-bold">FinFix</span>
              <span className="text-[#737373] text-sm">India</span>
            </div>
            <p className="text-[#737373] text-xs max-w-xs">
              Free financial health check for salaried Indians. No data stored on servers. Everything runs in your browser.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <nav className="flex gap-4">
              <Link href="/onboard" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Health Check</Link>
              <Link href="/planner" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Debt Planner</Link>
              <Link href="/tracker" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">Budget</Link>
              <Link href="/advisor" className="text-[#737373] hover:text-[#e5e5e5] transition-colors">AI Advisor</Link>
            </nav>
            <p className="text-[#525252] text-xs text-right">
              For informational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
