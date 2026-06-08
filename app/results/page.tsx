'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { loadProfile, type FinancialProfile } from '@/lib/storage'
import { computeHealthScore, type HealthScoreResult } from '@/lib/healthScore'
import { computeDebtPayoff, type LoanInput } from '@/lib/debtPayoffEngine'
import { toPaise, formatINRCompact, formatINR } from '@/lib/currency'
import { monthsToYearsMonths } from '@/lib/utils'

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const color = grade === 'green' ? '#22c55e' : grade === 'amber' ? '#f59e0b' : '#ef4444'
  const radius = 54
  const circ = 2 * Math.PI * radius
  const fill = (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#262626" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-[#e5e5e5]">{score}</div>
        <div className="text-xs text-[#737373]">/ 100</div>
      </div>
    </div>
  )
}

function ComponentBar({ label, score, weight, detail }: { label: string; score: number; weight: number; detail: string }) {
  const color = score >= 65 ? '#22c55e' : score >= 35 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[#a3a3a3]">{label}</span>
        <span className="text-xs text-[#737373]">{weight}% weight</span>
      </div>
      <div className="h-2 bg-[#262626] rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-[#525252]">{detail}</p>
    </div>
  )
}

function buildActions(profile: FinancialProfile, result: HealthScoreResult): { title: string; detail: string; priority: 'high' | 'medium' | 'low' }[] {
  const actions = []
  const goldLoan = profile.loans.find(l => l.type === 'gold')
  const highestRateLoan = [...profile.loans].sort((a, b) => b.interestRate - a.interestRate)[0]

  if (result.monthlySurplus < 0) {
    actions.push({
      title: `Cut variable spend by ₹${Math.abs(result.monthlySurplus).toLocaleString('en-IN')} immediately`,
      detail: 'You are spending more than you earn. Every month without action adds to your debt. Identify and cut 3 non-essential expenses this week.',
      priority: 'high' as const,
    })
  }

  if (goldLoan) {
    const yearlySaving = goldLoan.emiAmount * 12
    actions.push({
      title: `Close gold loan — saves ₹${yearlySaving.toLocaleString('en-IN')}/year`,
      detail: `Gold loan at ${goldLoan.interestRate}% is interest-only — principal never reduces. Sell gold or use any lump sum to close this before anything else. ₹${goldLoan.emiAmount.toLocaleString('en-IN')}/month frees up permanently.`,
      priority: 'high' as const,
    })
  }

  if (highestRateLoan && highestRateLoan.interestRate > 10) {
    actions.push({
      title: `Prepay ${highestRateLoan.name} first — highest cost debt at ${highestRateLoan.interestRate}%`,
      detail: `Every ₹1,000 you prepay on this loan saves you ₹${(highestRateLoan.interestRate / 100 * 1000 / 12).toFixed(0)}/month in interest. Even ₹5,000/month extra cuts years off the tenure.`,
      priority: 'medium' as const,
    })
  }

  if (result.monthlySurplus >= 0 && result.monthlySurplus < profile.salary * 0.1) {
    actions.push({
      title: 'Build a ₹50,000 emergency buffer before investing',
      detail: 'With no emergency fund, any medical or car expense goes on a credit card or new loan. Park ₹5,000/month in a separate account until you have 1 month of expenses saved.',
      priority: 'medium' as const,
    })
  }

  if (result.dtiRatio > 50) {
    actions.push({
      title: 'Explore balance transfer or loan restructuring',
      detail: `Your EMI burden is ${result.dtiRatio.toFixed(0)}% of income. Call your bank and ask for a lower rate or tenure extension to reduce monthly pressure while you build surplus.`,
      priority: 'low' as const,
    })
  }

  return actions.slice(0, 4)
}

export default function ResultsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<FinancialProfile | null>(null)
  const [result, setResult] = useState<HealthScoreResult | null>(null)
  const [debtFreeMonths, setDebtFreeMonths] = useState<number | null>(null)
  const [totalDebt, setTotalDebt] = useState(0)

  useEffect(() => {
    const p = loadProfile()
    if (!p) { router.push('/onboard'); return }
    setProfile(p)

    const totalEMI = p.loans.reduce((s, l) => s + l.emiAmount, 0)
    const debt = p.loans.reduce((s, l) => s + l.outstanding, 0)
    setTotalDebt(debt)

    const r = computeHealthScore({
      monthlySalary: p.salary,
      totalMonthlyEMI: totalEMI,
      fixedExpenses: p.fixedExpenses,
      variableExpenses: p.variableExpenses,
      totalOutstandingDebt: debt,
    })
    setResult(r)

    if (p.loans.length > 0) {
      const loanInputs: LoanInput[] = p.loans.map(l => ({
        id: l.id,
        name: l.name || l.type,
        outstanding: toPaise(l.outstanding),
        interestRate: l.interestRate,
        emiAmount: toPaise(l.emiAmount),
        loanType: l.loanType,
      }))
      const payoff = computeDebtPayoff(loanInputs, 0n, 'avalanche')
      setDebtFreeMonths(payoff.debtFreeMonths)
    }
  }, [router])

  if (!profile || !result) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#737373]">Calculating your finance health score...</p>
        </main>
      </>
    )
  }

  const gradeColor = result.grade === 'green' ? '#22c55e' : result.grade === 'amber' ? '#f59e0b' : '#ef4444'
  const gradeBg = result.grade === 'green' ? 'bg-green-950/30 border-green-900/50' : result.grade === 'amber' ? 'bg-amber-950/30 border-amber-900/50' : 'bg-red-950/30 border-red-900/50'
  const actions = buildActions(profile, result)

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Score Header */}
        <div className={`rounded-2xl border p-8 mb-6 ${gradeBg}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={result.score} grade={result.grade} />
            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: gradeColor }}>
                Finance Health Score
              </p>
              <h1 className="text-2xl font-bold text-[#e5e5e5] mb-2">{result.label}</h1>
              <p className="text-[#a3a3a3] text-sm leading-relaxed max-w-md">{result.verdict}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
            <p className="text-xs text-[#737373] mb-1">Monthly Surplus</p>
            <p className={`text-lg font-bold ${result.monthlySurplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.monthlySurplus >= 0 ? '+' : ''}₹{Math.abs(result.monthlySurplus).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
            <p className="text-xs text-[#737373] mb-1">EMI Burden</p>
            <p className={`text-lg font-bold ${result.dtiRatio > 50 ? 'text-red-400' : result.dtiRatio > 35 ? 'text-amber-400' : 'text-green-400'}`}>
              {result.dtiRatio.toFixed(0)}%
            </p>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
            <p className="text-xs text-[#737373] mb-1">Total Debt</p>
            <p className="text-lg font-bold text-red-400">{formatINRCompact(totalDebt * 100)}</p>
          </div>
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
            <p className="text-xs text-[#737373] mb-1">Debt Free In</p>
            <p className="text-lg font-bold text-[#e5e5e5]">
              {debtFreeMonths ? monthsToYearsMonths(debtFreeMonths) : '—'}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-5">Score Breakdown</h2>
          <div className="space-y-5">
            <ComponentBar {...result.components.dti} />
            <ComponentBar {...result.components.monthlySurplus} />
            <ComponentBar {...result.components.debtBurden} />
            <ComponentBar {...result.components.savingsRate} />
          </div>
        </div>

        {/* Action Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#e5e5e5] mb-4">Your Action Plan</h2>
          <div className="space-y-3">
            {actions.map((action, i) => (
              <div key={i} className={`rounded-xl border p-5 ${
                action.priority === 'high' ? 'bg-red-950/20 border-red-900/40' :
                action.priority === 'medium' ? 'bg-amber-950/20 border-amber-900/40' :
                'bg-[#141414] border-[#262626]'
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${
                    action.priority === 'high' ? 'bg-red-900/50 text-red-300' :
                    action.priority === 'medium' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-[#262626] text-[#737373]'
                  }`}>
                    {action.priority === 'high' ? 'URGENT' : action.priority === 'medium' ? 'IMPORTANT' : 'CONSIDER'}
                  </span>
                </div>
                <h3 className="font-semibold text-[#e5e5e5] mt-2 mb-1">{action.title}</h3>
                <p className="text-sm text-[#737373] leading-relaxed">{action.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Summary */}
        {profile.loans.length > 0 && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">Your Loans</h2>
            <div className="space-y-3">
              {profile.loans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2 border-b border-[#262626] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#e5e5e5]">{loan.name || loan.type}</p>
                    <p className="text-xs text-[#737373]">{loan.interestRate}% p.a. · {loan.loanType === 'interest_only' ? 'Interest only' : 'Reducing balance'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#e5e5e5]">{formatINR(loan.outstanding * 100)}</p>
                    <p className="text-xs text-red-400">₹{loan.emiAmount.toLocaleString('en-IN')}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <Link
            href="/planner"
            className="bg-[#f59e0b] text-black font-bold py-3.5 rounded-xl text-center hover:bg-[#d97706] transition-colors"
          >
            Open Debt Planner →
          </Link>
          <Link
            href="/advisor"
            className="border border-[#262626] text-[#e5e5e5] font-medium py-3.5 rounded-xl text-center hover:bg-[#141414] transition-colors"
          >
            Ask AI Advisor
          </Link>
        </div>

        <div className="text-center">
          <Link href="/onboard" className="text-xs text-[#525252] hover:text-[#737373] transition-colors">
            Update my numbers
          </Link>
        </div>

      </main>
      <Footer />
    </>
  )
}
