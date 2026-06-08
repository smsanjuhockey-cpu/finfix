'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { loadProfile, loadExpenses, saveExpenses, type ExpenseEntry } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const CATEGORIES = [
  { label: 'Groceries & Household', color: '#22c55e' },
  { label: 'Fuel & Transport', color: '#3b82f6' },
  { label: 'Dining & Food', color: '#f59e0b' },
  { label: 'Medical & Health', color: '#ef4444' },
  { label: 'Shopping & Clothing', color: '#a855f7' },
  { label: 'Entertainment & OTT', color: '#ec4899' },
  { label: 'Children & Baby', color: '#06b6d4' },
  { label: 'Travel', color: '#84cc16' },
  { label: 'Parents & Family', color: '#fb923c' },
  { label: 'Miscellaneous', color: '#737373' },
]

const today = new Date().toISOString().slice(0, 10)
const thisMonth = today.slice(0, 7)

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function TrackerPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [month, setMonth] = useState(thisMonth)
  const [budget, setBudget] = useState(30000)
  const [salary, setSalary] = useState(0)

  // Add form state
  const [form, setForm] = useState({ date: today, category: CATEGORIES[0].label, amount: '', note: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const p = loadProfile()
    if (p) {
      setSalary(p.salary)
      setBudget(Math.max(p.variableExpenses || 30000, 10000))
    }
    setExpenses(loadExpenses())
  }, [])

  const monthExpenses = expenses.filter(e => e.date.startsWith(month))
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const remaining = budget - totalSpent
  const spentPct = Math.min((totalSpent / budget) * 100, 100)

  // Category breakdown
  const categoryTotals = CATEGORIES.map(cat => {
    const total = monthExpenses.filter(e => e.category === cat.label).reduce((s, e) => s + e.amount, 0)
    return { ...cat, total }
  }).filter(c => c.total > 0)

  // Daily spend for bar chart
  const dailyMap: Record<string, number> = {}
  monthExpenses.forEach(e => {
    dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount
  })
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ day: date.slice(8), amount }))

  function addExpense() {
    if (!form.amount || parseFloat(form.amount) <= 0) return
    const entry: ExpenseEntry = {
      id: generateId(),
      date: form.date,
      category: form.category,
      amount: parseFloat(form.amount),
      note: form.note,
    }
    const updated = [entry, ...expenses]
    setExpenses(updated)
    saveExpenses(updated)
    setForm({ date: today, category: CATEGORIES[0].label, amount: '', note: '' })
    setAdding(false)
  }

  function deleteExpense(id: string) {
    const updated = expenses.filter(e => e.id !== id)
    setExpenses(updated)
    saveExpenses(updated)
  }

  // Navigate months
  function changeMonth(dir: -1 | 1) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#e5e5e5] mb-1">Budget Tracker</h1>
            <p className="text-[#737373] text-sm">Track your variable spending. See where money goes.</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="bg-[#f59e0b] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#d97706] transition-colors text-sm"
          >
            + Add Expense
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => changeMonth(-1)} className="text-[#737373] hover:text-[#e5e5e5] transition-colors px-2 py-1">←</button>
          <span className="text-[#e5e5e5] font-semibold">{getMonthLabel(month)}</span>
          <button
            onClick={() => changeMonth(1)}
            disabled={month >= thisMonth}
            className="text-[#737373] hover:text-[#e5e5e5] transition-colors px-2 py-1 disabled:opacity-30"
          >→</button>
        </div>

        {/* Budget Bar */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-[#a3a3a3]">Monthly Variable Budget</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#737373] text-sm">₹</span>
                <input
                  type="number"
                  value={budget}
                  onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                  className="bg-transparent text-[#f59e0b] font-bold text-lg w-28 focus:outline-none"
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#737373]">Spent</p>
              <p className={`text-xl font-bold ${spentPct >= 100 ? 'text-red-400' : spentPct >= 80 ? 'text-amber-400' : 'text-[#e5e5e5]'}`}>
                ₹{totalSpent.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="h-3 bg-[#262626] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${spentPct >= 100 ? 'bg-red-500' : spentPct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#737373]">
            <span>{spentPct.toFixed(0)}% used</span>
            <span className={remaining < 0 ? 'text-red-400' : 'text-green-400'}>
              {remaining >= 0 ? `₹${remaining.toLocaleString('en-IN')} remaining` : `₹${Math.abs(remaining).toLocaleString('en-IN')} over budget`}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* Category Pie */}
          {categoryTotals.length > 0 ? (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="total"
                    nameKey="label"
                  >
                    {categoryTotals.map((cat, i) => (
                      <Cell key={cat.label} fill={cat.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#141414', border: '1px solid #262626', borderRadius: 8 }}
                    formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#737373' }}
                    formatter={(value) => value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-[#141414] border border-dashed border-[#262626] rounded-xl p-8 flex items-center justify-center">
              <p className="text-[#525252] text-sm text-center">Add expenses to see category breakdown</p>
            </div>
          )}

          {/* Daily Bar Chart */}
          {dailyData.length > 0 ? (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">Daily Spending</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="day" stroke="#525252" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#525252" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip
                    contentStyle={{ background: '#141414', border: '1px solid #262626', borderRadius: 8 }}
                    formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Spent']}
                    labelFormatter={l => `Day ${l}`}
                  />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-[#141414] border border-dashed border-[#262626] rounded-xl p-8 flex items-center justify-center">
              <p className="text-[#525252] text-sm text-center">Daily chart appears once you add expenses</p>
            </div>
          )}
        </div>

        {/* Category Summary */}
        {categoryTotals.length > 0 && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-3">Category Breakdown</h3>
            <div className="space-y-2">
              {categoryTotals.sort((a, b) => b.total - a.total).map(cat => (
                <div key={cat.label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-[#a3a3a3] flex-1">{cat.label}</span>
                  <span className="text-sm font-medium text-[#e5e5e5]">₹{cat.total.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-[#525252] w-10 text-right">{((cat.total / totalSpent) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense Log */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">
            Expense Log — {monthExpenses.length} entries
          </h3>
          {monthExpenses.length === 0 ? (
            <p className="text-[#525252] text-sm text-center py-8">
              No expenses logged for {getMonthLabel(month)}. Click &quot;Add Expense&quot; to start tracking.
            </p>
          ) : (
            <div className="space-y-2">
              {monthExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => {
                const cat = CATEGORIES.find(c => c.label === e.category)
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color || '#737373' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e5e5e5] truncate">{e.note || e.category}</p>
                      <p className="text-xs text-[#525252]">{e.category} · {e.date}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#e5e5e5]">₹{e.amount.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="text-[#525252] hover:text-red-400 text-xs transition-colors ml-1"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add Expense Modal */}
        {adding && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#e5e5e5]">Add Expense</h2>
                <button onClick={() => setAdding(false)} className="text-[#737373] hover:text-[#e5e5e5] text-xl">✕</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f59e0b] text-sm font-bold">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        autoFocus
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg pl-7 pr-3 py-2 text-[#e5e5e5] text-sm font-semibold focus:outline-none focus:border-[#f59e0b]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#737373] mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b]"
                  >
                    {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#737373] mb-1">Note (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Big Basket order"
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addExpense()}
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-[#e5e5e5] text-sm focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setAdding(false)}
                    className="flex-1 border border-[#262626] text-[#737373] py-2.5 rounded-lg text-sm hover:bg-[#1a1a1a]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addExpense}
                    disabled={!form.amount || parseFloat(form.amount) <= 0}
                    className="flex-1 bg-[#f59e0b] text-black font-bold py-2.5 rounded-lg text-sm hover:bg-[#d97706] disabled:opacity-40"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </>
  )
}
