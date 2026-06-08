'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { saveProfile, type Loan } from '@/lib/storage'
import { generateId } from '@/lib/utils'

type Step = 1 | 2 | 3

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'gold', label: 'Gold Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
]

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [salary, setSalary] = useState('')

  // Step 2
  const [loans, setLoans] = useState<Loan[]>([
    { id: generateId(), name: '', outstanding: 0, emiAmount: 0, interestRate: 0, loanType: 'reducing_balance', type: 'personal' },
  ])

  // Step 3
  const [fixedExpenses, setFixedExpenses] = useState('')
  const [variableExpenses, setVariableExpenses] = useState('')

  function addLoan() {
    setLoans(prev => [...prev, {
      id: generateId(),
      name: '',
      outstanding: 0,
      emiAmount: 0,
      interestRate: 0,
      loanType: 'reducing_balance',
      type: 'personal',
    }])
  }

  function removeLoan(id: string) {
    setLoans(prev => prev.filter(l => l.id !== id))
  }

  function updateLoan(id: string, field: keyof Loan, value: string | number) {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  function handleFinish() {
    saveProfile({
      salary: parseFloat(salary) || 0,
      loans: loans.filter(l => l.emiAmount > 0 || l.outstanding > 0),
      fixedExpenses: parseFloat(fixedExpenses) || 0,
      variableExpenses: parseFloat(variableExpenses) || 0,
    })
    router.push('/results')
  }

  const salaryNum = parseFloat(salary) || 0
  const totalEMI = loans.reduce((s, l) => s + (l.emiAmount || 0), 0)
  const dtiPreview = salaryNum > 0 ? ((totalEMI / salaryNum) * 100).toFixed(0) : null

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#737373]">Step {step} of 3</span>
            <span className="text-sm text-[#737373]">
              {step === 1 ? 'Income' : step === 2 ? 'Loans & EMIs' : 'Monthly Expenses'}
            </span>
          </div>
          <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#f59e0b] rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Income */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-[#e5e5e5] mb-1">What is your monthly take-home salary?</h1>
            <p className="text-[#737373] text-sm mb-8">After all TDS deductions. The amount that lands in your bank account every month.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#a3a3a3] mb-2">Monthly Take-Home (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f59e0b] font-bold text-lg">₹</span>
                <input
                  type="number"
                  placeholder="75,000"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-3.5 text-[#e5e5e5] text-lg font-semibold focus:outline-none focus:border-[#f59e0b] transition-colors"
                />
              </div>
              {salaryNum > 0 && (
                <p className="text-[#737373] text-xs mt-2">
                  ₹{salaryNum.toLocaleString('en-IN')} per month · ₹{(salaryNum * 12).toLocaleString('en-IN')} per year
                </p>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-8">
              <p className="text-[#737373] text-xs leading-relaxed">
                <span className="text-[#a3a3a3] font-medium">Why this?</span> Your salary is the denominator for every ratio we calculate. A ₹75,000 salary with ₹30,000 in EMIs means 40% of your income is already committed — that is the most important number to know.
              </p>
            </div>

            <button
              onClick={() => salaryNum > 0 && setStep(2)}
              disabled={!salaryNum}
              className="w-full bg-[#f59e0b] text-black font-bold py-3.5 rounded-xl hover:bg-[#d97706] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Add Your Loans →
            </button>
          </div>
        )}

        {/* Step 2 — Loans */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-[#e5e5e5] mb-1">What loans are you currently paying?</h1>
            <p className="text-[#737373] text-sm mb-6">Add all active loans. Even if you think the EMI is small — add it.</p>

            {/* DTI Preview */}
            {dtiPreview && (
              <div className={`rounded-xl border p-3 mb-6 ${
                parseInt(dtiPreview) > 50 ? 'bg-red-950/30 border-red-900/50 text-red-400' :
                parseInt(dtiPreview) > 35 ? 'bg-amber-950/30 border-amber-900/50 text-amber-400' :
                'bg-green-950/30 border-green-900/50 text-green-400'
              }`}>
                <span className="text-sm font-medium">
                  Current EMI burden: {dtiPreview}% of salary (₹{totalEMI.toLocaleString('en-IN')}/month)
                  {parseInt(dtiPreview) > 50 ? ' — Critical' : parseInt(dtiPreview) > 35 ? ' — High' : ' — OK'}
                </span>
              </div>
            )}

            <div className="space-y-4 mb-4">
              {loans.map((loan, idx) => (
                <div key={loan.id} className="bg-[#141414] border border-[#262626] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-[#a3a3a3]">Loan {idx + 1}</span>
                    {loans.length > 1 && (
                      <button onClick={() => removeLoan(loan.id)} className="text-[#737373] hover:text-red-400 text-xs transition-colors">
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-[#737373] mb-1">Loan Name</label>
                      <input
                        type="text"
                        placeholder="e.g. ICICI Personal Loan"
                        value={loan.name}
                        onChange={e => updateLoan(loan.id, 'name', e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Type</label>
                      <select
                        value={loan.type}
                        onChange={e => {
                          const isGold = e.target.value === 'gold'
                          updateLoan(loan.id, 'type', e.target.value)
                          if (isGold) updateLoan(loan.id, 'loanType', 'interest_only')
                        }}
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                      >
                        {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Interest Rate (%/year)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="10.5"
                        value={loan.interestRate || ''}
                        onChange={e => updateLoan(loan.id, 'interestRate', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Outstanding Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="5,00,000"
                        value={loan.outstanding || ''}
                        onChange={e => updateLoan(loan.id, 'outstanding', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#737373] mb-1">
                        {loan.loanType === 'interest_only' ? 'Monthly Interest (₹)' : 'Monthly EMI (₹)'}
                      </label>
                      <input
                        type="number"
                        placeholder={loan.loanType === 'interest_only' ? '8,000' : '15,000'}
                        value={loan.emiAmount || ''}
                        onChange={e => updateLoan(loan.id, 'emiAmount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                      />
                    </div>

                    {loan.type === 'gold' && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`io-${loan.id}`}
                            checked={loan.loanType === 'interest_only'}
                            onChange={e => updateLoan(loan.id, 'loanType', e.target.checked ? 'interest_only' : 'reducing_balance')}
                            className="accent-amber-500"
                          />
                          <label htmlFor={`io-${loan.id}`} className="text-xs text-[#a3a3a3]">
                            Interest-only loan (principal never reduces)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {loans.length < 5 && (
              <button
                onClick={addLoan}
                className="w-full border border-dashed border-[#262626] text-[#737373] hover:border-[#f59e0b]/50 hover:text-[#f59e0b] rounded-xl py-3 text-sm transition-colors mb-6"
              >
                + Add Another Loan
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-[#262626] text-[#737373] py-3 rounded-xl text-sm hover:bg-[#141414] transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-2 w-full bg-[#f59e0b] text-black font-bold py-3 rounded-xl hover:bg-[#d97706] transition-colors"
              >
                Next: Monthly Expenses →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Expenses */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-[#e5e5e5] mb-1">What are your monthly expenses?</h1>
            <p className="text-[#737373] text-sm mb-8">Excluding EMIs. These are the other commitments you have every month.</p>

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#a3a3a3] mb-1">Fixed Monthly Expenses (₹)</label>
                <p className="text-xs text-[#525252] mb-2">Rent, insurance, school fees, parents — things that are the same every month</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f59e0b] font-bold">₹</span>
                  <input
                    type="number"
                    placeholder="20,000"
                    value={fixedExpenses}
                    onChange={e => setFixedExpenses(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-3 text-[#e5e5e5] font-semibold focus:outline-none focus:border-[#f59e0b] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a3a3a3] mb-1">Variable Monthly Expenses (₹)</label>
                <p className="text-xs text-[#525252] mb-2">Groceries, fuel, dining, entertainment, shopping — what varies month to month</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#f59e0b] font-bold">₹</span>
                  <input
                    type="number"
                    placeholder="30,000"
                    value={variableExpenses}
                    onChange={e => setVariableExpenses(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-3 text-[#e5e5e5] font-semibold focus:outline-none focus:border-[#f59e0b] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Live preview */}
            {salaryNum > 0 && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-6">
                <p className="text-xs text-[#737373] font-medium uppercase tracking-wide mb-3">Monthly Summary Preview</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Take-home salary</span>
                    <span className="text-green-400 font-medium">+₹{salaryNum.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Total EMIs</span>
                    <span className="text-red-400">-₹{totalEMI.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Fixed expenses</span>
                    <span className="text-red-400">-₹{(parseFloat(fixedExpenses) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Variable expenses</span>
                    <span className="text-red-400">-₹{(parseFloat(variableExpenses) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-[#262626] pt-2 flex justify-between font-semibold">
                    <span className="text-[#a3a3a3]">Monthly surplus / deficit</span>
                    {(() => {
                      const surplus = salaryNum - totalEMI - (parseFloat(fixedExpenses) || 0) - (parseFloat(variableExpenses) || 0)
                      return (
                        <span className={surplus >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {surplus >= 0 ? '+' : ''}₹{surplus.toLocaleString('en-IN')}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-[#262626] text-[#737373] py-3.5 rounded-xl text-sm hover:bg-[#141414] transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                className="flex-2 w-full bg-[#f59e0b] text-black font-bold py-3.5 rounded-xl hover:bg-[#d97706] transition-all hover:scale-[1.02]"
              >
                See My Finance Health Score →
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
