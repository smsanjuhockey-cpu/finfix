'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { loadProfile, saveProfile, type Loan } from '@/lib/storage'
import { computeDebtPayoff, simulateLumpSum, type LoanInput } from '@/lib/debtPayoffEngine'
import { toPaise, formatINR, formatINRCompact } from '@/lib/currency'
import { monthsToYearsMonths, generateId } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

type Strategy = 'avalanche' | 'snowball' | 'custom'

function buildChartData(loans: LoanInput[], extra: bigint, strategy: Strategy) {
  const result = computeDebtPayoff(loans, extra, strategy)
  return result.monthlySchedule
    .filter((_, i) => i % 3 === 0 || i === result.monthlySchedule.length - 1)
    .map((snap) => ({
      month: snap.month,
      label: `Month ${snap.month}`,
      total: Math.round(Number(snap.totalDebt) / 100),
      ...Object.fromEntries(
        Object.entries(snap.balances).map(([id, bal]) => [
          loans.find(l => l.id === id)?.name || id,
          Math.round(Number(bal) / 100),
        ])
      ),
    }))
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#22c55e']

export default function PlannerPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [extraPayment, setExtraPayment] = useState(0)
  const [goldValue, setGoldValue] = useState('')
  const [chartData, setChartData] = useState<ReturnType<typeof buildChartData>>([])
  const [payoffResult, setPayoffResult] = useState<ReturnType<typeof computeDebtPayoff> | null>(null)
  const [noExtraResult, setNoExtraResult] = useState<ReturnType<typeof computeDebtPayoff> | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  const toLoanInputs = (ls: Loan[]): LoanInput[] =>
    ls.filter(l => l.outstanding > 0).map(l => ({
      id: l.id,
      name: l.name || l.type,
      outstanding: toPaise(l.outstanding),
      interestRate: l.interestRate,
      emiAmount: toPaise(l.emiAmount),
      loanType: l.loanType,
    }))

  const recompute = useCallback((ls: Loan[], extra: number, strat: Strategy) => {
    const inputs = toLoanInputs(ls)
    if (inputs.length === 0) return
    const extraPaise = toPaise(extra)
    const result = computeDebtPayoff(inputs, extraPaise, strat)
    const noExtra = computeDebtPayoff(inputs, 0n, strat)
    setPayoffResult(result)
    setNoExtraResult(noExtra)
    setChartData(buildChartData(inputs, extraPaise, strat))
  }, [])

  useEffect(() => {
    const p = loadProfile()
    if (p && p.loans.length > 0) {
      setLoans(p.loans)
      setHasProfile(true)
      recompute(p.loans, 0, strategy)
    }
  }, [strategy, recompute])

  useEffect(() => {
    if (loans.length > 0) recompute(loans, extraPayment, strategy)
  }, [loans, extraPayment, strategy, recompute])

  function addLoan() {
    const newLoan: Loan = {
      id: generateId(),
      name: '',
      outstanding: 0,
      emiAmount: 0,
      interestRate: 0,
      loanType: 'reducing_balance',
      type: 'personal',
    }
    const updated = [...loans, newLoan]
    setLoans(updated)
  }

  function updateLoan(id: string, field: keyof Loan, value: string | number) {
    const updated = loans.map(l => l.id === id ? { ...l, [field]: value } : l)
    setLoans(updated)
    const p = loadProfile()
    if (p) saveProfile({ ...p, loans: updated })
  }

  function removeLoan(id: string) {
    const updated = loans.filter(l => l.id !== id)
    setLoans(updated)
  }

  // Gold loan analysis
  const goldLoan = loans.find(l => l.type === 'gold')
  const goldValueNum = parseFloat(goldValue) || 0
  const goldLTV = goldLoan && goldValueNum > 0
    ? ((goldLoan.outstanding / goldValueNum) * 100).toFixed(0)
    : null
  const goldPayoffSavings = goldLoan
    ? simulateLumpSum(toLoanInputs(loans), toPaise(extraPayment), strategy, toPaise(goldLoan.outstanding), goldLoan.id)
    : null

  const monthsSaved = noExtraResult && payoffResult
    ? noExtraResult.debtFreeMonths - payoffResult.debtFreeMonths
    : 0
  const interestSaved = noExtraResult && payoffResult
    ? Number(noExtraResult.totalInterestPaid - payoffResult.totalInterestPaid) / 100
    : 0

  const loanNames = loans.filter(l => l.outstanding > 0).map(l => l.name || l.type)

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#e5e5e5] mb-1">Debt Planner</h1>
          <p className="text-[#737373] text-sm">
            See your debt freedom date and how extra prepayments cut years off your loans.
            {hasProfile && <span className="text-[#525252]"> Loaded from your saved profile.</span>}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left: Controls */}
          <div className="space-y-5">

            {/* Strategy */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-3">Payoff Strategy</h3>
              <div className="space-y-2">
                {([
                  { value: 'avalanche', label: 'Avalanche', detail: 'Highest rate first — saves most interest' },
                  { value: 'snowball', label: 'Snowball', detail: 'Smallest balance first — psychological wins' },
                  { value: 'custom', label: 'Custom', detail: 'Your priority order' },
                ] as { value: Strategy; label: string; detail: string }[]).map((s) => (
                  <label key={s.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      value={s.value}
                      checked={strategy === s.value}
                      onChange={() => setStrategy(s.value)}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#e5e5e5]">{s.label}</p>
                      <p className="text-xs text-[#737373]">{s.detail}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Extra Payment Slider */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-3">Extra Monthly Prepayment</h3>
              <div className="text-center mb-3">
                <span className="text-2xl font-bold text-[#f59e0b]">₹{extraPayment.toLocaleString('en-IN')}</span>
                <p className="text-xs text-[#737373]">above your regular EMIs</p>
              </div>
              <input
                type="range"
                min={0}
                max={100000}
                step={1000}
                value={extraPayment}
                onChange={e => setExtraPayment(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#525252] mt-1">
                <span>₹0</span>
                <span>₹1L</span>
              </div>

              {monthsSaved > 0 && (
                <div className="mt-4 bg-green-950/30 border border-green-900/50 rounded-lg p-3 text-center">
                  <p className="text-green-400 font-semibold text-sm">
                    {monthsToYearsMonths(monthsSaved)} saved
                  </p>
                  <p className="text-xs text-[#737373] mt-0.5">
                    ₹{interestSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 })} interest saved
                  </p>
                </div>
              )}
            </div>

            {/* Gold Loan Analyser */}
            {goldLoan && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-3">Gold Loan Analyser</h3>
                <p className="text-xs text-[#737373] mb-3">
                  Your gold loan is interest-only — the outstanding never reduces. Closing it frees ₹{goldLoan.emiAmount.toLocaleString('en-IN')}/month permanently.
                </p>
                <div>
                  <label className="block text-xs text-[#737373] mb-1">Current market value of pledged gold (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f59e0b] text-sm font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="72,94,000"
                      value={goldValue}
                      onChange={e => setGoldValue(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg pl-7 pr-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                </div>
                {goldLTV && (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Gold value</span>
                      <span className="text-[#e5e5e5]">₹{goldValueNum.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Loan outstanding</span>
                      <span className="text-red-400">₹{goldLoan.outstanding.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-[#737373]">LTV Ratio</span>
                      <span className={parseInt(goldLTV) < 60 ? 'text-green-400' : 'text-amber-400'}>{goldLTV}%</span>
                    </div>
                    {goldPayoffSavings && (
                      <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 mt-2">
                        <p className="text-amber-400 font-semibold text-xs">
                          Closing gold loan saves {monthsToYearsMonths(goldPayoffSavings.monthsSaved)} + {formatINRCompact(goldPayoffSavings.interestSaved)} interest
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Chart + Results */}
          <div className="lg:col-span-2 space-y-5">

            {/* Debt Freedom Summary */}
            {payoffResult && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#737373] mb-1">Debt Free In</p>
                  <p className="text-lg font-bold text-[#f59e0b]">{monthsToYearsMonths(payoffResult.debtFreeMonths)}</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#737373] mb-1">Debt Free Date</p>
                  <p className="text-sm font-bold text-[#e5e5e5]">
                    {payoffResult.debtFreeDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#737373] mb-1">Total Interest</p>
                  <p className="text-lg font-bold text-red-400">{formatINRCompact(payoffResult.totalInterestPaid)}</p>
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">Debt Balance Over Time</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      {loanNames.map((name, i) => (
                        <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="month" stroke="#525252" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fill: '#525252', fontSize: 11 }} />
                    <YAxis
                      stroke="#525252"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{ background: '#141414', border: '1px solid #262626', borderRadius: 8 }}
                      labelStyle={{ color: '#a3a3a3', fontSize: 12 }}
                      formatter={(value, name) => [
                        `₹${Number(value).toLocaleString('en-IN')}`,
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#737373' }} />
                    {loanNames.map((name, i) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={`url(#grad-${i})`}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Milestones */}
            {payoffResult && payoffResult.milestones.length > 0 && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">Loan Closure Timeline</h3>
                <div className="space-y-3">
                  {payoffResult.milestones.map((m, i) => (
                    <div key={m.loanId} className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full bg-[#1a1a0a] border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#e5e5e5]">{m.loanName} closes</p>
                        <p className="text-xs text-[#737373]">
                          {m.closesAtDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          {Number(m.freedEMI) > 0 && ` · Frees ₹${(Number(m.freedEMI) / 100).toLocaleString('en-IN')}/month → stacks to next loan`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add loan if no profile */}
            {loans.length === 0 && (
              <div className="bg-[#141414] border border-dashed border-[#262626] rounded-xl p-8 text-center">
                <p className="text-[#737373] mb-4">No loans loaded. Complete the health check or add loans manually.</p>
                <div className="flex gap-3 justify-center">
                  <a href="/onboard" className="bg-[#f59e0b] text-black font-bold px-5 py-2.5 rounded-lg text-sm">
                    Do Health Check
                  </a>
                  <button onClick={addLoan} className="border border-[#262626] text-[#e5e5e5] px-5 py-2.5 rounded-lg text-sm hover:bg-[#1a1a1a]">
                    Add Loan Manually
                  </button>
                </div>
              </div>
            )}

            {/* Manual loan editor if loaded */}
            {loans.length > 0 && (
              <details className="bg-[#141414] border border-[#262626] rounded-xl">
                <summary className="p-5 text-sm text-[#737373] cursor-pointer hover:text-[#a3a3a3]">
                  Edit loan details
                </summary>
                <div className="px-5 pb-5 space-y-3">
                  {loans.map((loan) => (
                    <div key={loan.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center border border-[#262626] rounded-lg p-3">
                      <input
                        type="text"
                        placeholder="Loan name"
                        value={loan.name}
                        onChange={e => updateLoan(loan.id, 'name', e.target.value)}
                        className="col-span-2 md:col-span-1 bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-xs text-[#e5e5e5]"
                      />
                      <input
                        type="number"
                        placeholder="Outstanding ₹"
                        value={loan.outstanding || ''}
                        onChange={e => updateLoan(loan.id, 'outstanding', parseFloat(e.target.value) || 0)}
                        className="bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-xs text-[#e5e5e5]"
                      />
                      <input
                        type="number"
                        placeholder="EMI ₹"
                        value={loan.emiAmount || ''}
                        onChange={e => updateLoan(loan.id, 'emiAmount', parseFloat(e.target.value) || 0)}
                        className="bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-xs text-[#e5e5e5]"
                      />
                      <button onClick={() => removeLoan(loan.id)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                    </div>
                  ))}
                  <button onClick={addLoan} className="text-xs text-[#f59e0b] hover:text-amber-300">+ Add loan</button>
                </div>
              </details>
            )}

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
