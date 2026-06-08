'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { loadProfile } from '@/lib/storage'
import { computeHealthScore } from '@/lib/healthScore'
import { computeDebtPayoff, type LoanInput } from '@/lib/debtPayoffEngine'
import { toPaise } from '@/lib/currency'
import { monthsToYearsMonths } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'What should I do first to improve my finances?',
  'How do I become debt free faster?',
  'Should I prepay my loan or start a SIP?',
  'How do I build an emergency fund?',
  'Give me a step-by-step monthly budget plan',
  'How do I reduce my EMI burden?',
]

function buildFinancialContext(): string {
  const p = loadProfile()
  if (!p) return ''

  const totalEMI = p.loans.reduce((s, l) => s + l.emiAmount, 0)
  const totalDebt = p.loans.reduce((s, l) => s + l.outstanding, 0)
  const totalFixed = totalEMI + p.fixedExpenses
  const surplus = p.salary - totalFixed - p.variableExpenses

  const health = computeHealthScore({
    monthlySalary: p.salary,
    totalMonthlyEMI: totalEMI,
    fixedExpenses: p.fixedExpenses,
    variableExpenses: p.variableExpenses,
    totalOutstandingDebt: totalDebt,
  })

  let debtFreeInfo = ''
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
    debtFreeInfo = `Debt-free in: ${monthsToYearsMonths(payoff.debtFreeMonths)} (${payoff.debtFreeDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`
  }

  const loanDetails = p.loans.map(l =>
    `  - ${l.name || l.type}: ₹${l.outstanding.toLocaleString('en-IN')} outstanding, ₹${l.emiAmount.toLocaleString('en-IN')}/month EMI, ${l.interestRate}% p.a.${l.loanType === 'interest_only' ? ' (interest-only, principal never reduces)' : ''}`
  ).join('\n')

  return `Monthly take-home salary: ₹${p.salary.toLocaleString('en-IN')}
Total monthly EMIs: ₹${totalEMI.toLocaleString('en-IN')}
Fixed expenses (non-EMI): ₹${p.fixedExpenses.toLocaleString('en-IN')}
Variable expenses: ₹${p.variableExpenses.toLocaleString('en-IN')}
Monthly surplus/deficit: ${surplus >= 0 ? '+' : ''}₹${surplus.toLocaleString('en-IN')}

LOANS:
${loanDetails || '  (no loans recorded)'}

Finance Health Score: ${health.score}/100 (${health.label})
EMI-to-Income Ratio: ${health.dtiRatio.toFixed(0)}%
Total outstanding debt: ₹${totalDebt.toLocaleString('en-IN')}
${debtFreeInfo}`
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [financialContext, setFinancialContext] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const p = loadProfile()
    if (p) {
      setHasProfile(true)
      setFinancialContext(buildFinancialContext())
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return
    const userMsg: Message = { role: 'user', content: content.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, financialContext }),
      })

      if (!res.ok) throw new Error('Failed')

      const assistantMsg: Message = { role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistantMsg])

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please check your internet connection and try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e5e5e5] mb-1">AI Financial Advisor</h1>
          <p className="text-[#737373] text-sm">
            {hasProfile
              ? 'Claude AI with your actual financial data — ask anything about your specific situation.'
              : 'Complete the health check first so the AI has your numbers. It gives much better advice with real data.'}
          </p>
        </div>

        {/* Context badge */}
        {hasProfile && (
          <div className="bg-[#1a1a0a] border border-[#f59e0b]/20 rounded-xl p-3 mb-5 flex items-center gap-2">
            <span className="text-[#f59e0b] text-sm">📊</span>
            <p className="text-xs text-[#737373]">
              AI has your financial profile loaded — salary, EMIs, all loans, and health score.
            </p>
          </div>
        )}

        {!hasProfile && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-5 text-center">
            <p className="text-[#737373] mb-3 text-sm">For personalised advice, complete your finance health check first.</p>
            <a href="/onboard" className="bg-[#f59e0b] text-black font-bold px-5 py-2 rounded-lg text-sm">
              Do Health Check
            </a>
          </div>
        )}

        {/* Quick prompts — only show if no messages yet */}
        {messages.length === 0 && (
          <div className="mb-5">
            <p className="text-xs text-[#525252] mb-3 uppercase tracking-wide font-medium">Quick questions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs border border-[#262626] text-[#a3a3a3] px-3 py-1.5 rounded-lg hover:border-[#f59e0b]/50 hover:text-[#f59e0b] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex-1 space-y-4 mb-5 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#f59e0b] text-black font-medium rounded-br-none'
                  : 'bg-[#141414] border border-[#262626] text-[#e5e5e5] rounded-bl-none'
              }`}>
                {msg.role === 'assistant' && msg.content ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold text-[#f59e0b]">{children}</strong>,
                      h3: ({ children }) => <h3 className="font-bold text-[#e5e5e5] text-base mt-3 mb-1">{children}</h3>,
                      h2: ({ children }) => <h2 className="font-bold text-[#e5e5e5] text-base mt-3 mb-1">{children}</h2>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                      li: ({ children }) => <li className="text-[#e5e5e5]">{children}</li>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full text-xs border-collapse">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-[#262626]">{children}</thead>,
                      th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[#a3a3a3] border border-[#333]">{children}</th>,
                      td: ({ children }) => <td className="px-3 py-2 text-[#e5e5e5] border border-[#262626]">{children}</td>,
                      tr: ({ children }) => <tr className="even:bg-[#1a1a1a]">{children}</tr>,
                      code: ({ children }) => <code className="bg-[#262626] px-1.5 py-0.5 rounded text-[#f59e0b] text-xs font-mono">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-[#f59e0b] pl-3 my-2 text-[#a3a3a3]">{children}</blockquote>,
                      hr: () => <hr className="border-[#262626] my-3" />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : msg.role === 'user' ? msg.content : (
                  loading && i === messages.length - 1 ? (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#737373] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#737373] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#737373] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : ''
                )}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-[#141414] border border-[#262626] rounded-2xl rounded-bl-none px-4 py-3">
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#737373] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#737373] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#737373] animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-3 flex items-end gap-3 focus-within:border-[#f59e0b]/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances... (Enter to send)"
              rows={1}
              className="flex-1 bg-transparent text-[#e5e5e5] text-sm resize-none focus:outline-none placeholder:text-[#525252] max-h-32"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="bg-[#f59e0b] text-black font-bold w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#d97706] transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M14 8L8 2M14 8L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-[#525252] text-center mt-2">For informational purposes only. Not financial advice.</p>
        </div>

      </main>
      <Footer />
    </>
  )
}
