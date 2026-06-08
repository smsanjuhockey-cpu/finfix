import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const painPoints = [
  {
    icon: '💸',
    hindi: 'Mahine ke aakhir mein kuch nahi bachta',
    english: 'Month ends at zero',
    detail: "Salary hits the account. EMIs go. Bills go. Parents go. By the 20th, you're counting days.",
  },
  {
    icon: '🔗',
    hindi: 'Loan khatam hoga kab?',
    english: 'Loans feel endless',
    detail: "You've been paying EMI for years. The outstanding barely moves. Nobody told you how interest works.",
  },
  {
    icon: '🤷',
    hindi: 'Savings kahan se karein?',
    english: 'Savings seem impossible',
    detail: 'Every month you plan to save. Every month something comes up. Emergency fund is a dream.',
  },
]

const howItWorks = [
  { step: '01', title: 'Enter Your Numbers', detail: 'Salary, EMIs, monthly spend. Takes 3 minutes. No account needed.' },
  { step: '02', title: 'See Your Score', detail: 'Instant finance health score with plain-language verdict. Red / Amber / Green.' },
  { step: '03', title: 'Get Your Roadmap', detail: 'Exact steps to close debt, build savings, and free up cash — in your situation.' },
]

const features = [
  { icon: '📊', title: 'Finance Health Score', detail: 'Know exactly how stressed your finances are — from 0 to 100.' },
  { icon: '🎯', title: 'Debt Freedom Date', detail: "See when you'll be completely debt-free, and how to get there faster." },
  { icon: '📅', title: 'Monthly Budget Tracker', detail: 'Track where money goes. Category breakdown. No more surprises.' },
  { icon: '🤖', title: 'AI Financial Advisor', detail: 'Ask Claude AI your specific questions. Gets your actual numbers right.' },
]

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#1a1a0a] border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-medium px-3 py-1 rounded-full mb-6">
            Free — No sign-up required
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-[#e5e5e5] leading-tight mb-4">
            Salary aata hai,{' '}
            <span className="text-[#f59e0b]">kahan jaata hai?</span>
          </h1>
          <p className="text-lg md:text-xl text-[#737373] max-w-2xl mx-auto mb-8">
            5-minute finance health check for salaried Indians. Know your debt score, get a personalised roadmap, and start your path to financial freedom.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboard"
              className="bg-[#f59e0b] text-black font-bold text-base px-8 py-3.5 rounded-xl hover:bg-[#d97706] transition-all hover:scale-105 shadow-lg shadow-[#f59e0b]/20"
            >
              Check My Finance Health — Free
            </Link>
            <Link
              href="/planner"
              className="border border-[#262626] text-[#e5e5e5] font-medium text-base px-8 py-3.5 rounded-xl hover:bg-[#141414] transition-colors"
            >
              Debt Planner
            </Link>
          </div>
          <p className="text-[#525252] text-xs mt-4">
            No account needed · Data stays in your browser · Takes 3 minutes
          </p>
        </section>

        {/* Pain Points */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-center text-2xl font-bold text-[#e5e5e5] mb-2">If this sounds familiar, you need FinFix</h2>
          <p className="text-center text-[#737373] text-sm mb-8">You are not alone. Millions of salaried Indians face this every month.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {painPoints.map((p) => (
              <div key={p.hindi} className="bg-[#141414] border border-[#262626] rounded-xl p-6 hover:border-[#f59e0b]/40 transition-colors">
                <div className="text-3xl mb-3">{p.icon}</div>
                <p className="text-[#737373] text-sm mb-1 italic">&quot;{p.hindi}&quot;</p>
                <h3 className="text-[#e5e5e5] font-semibold text-lg mb-2">{p.english}</h3>
                <p className="text-[#737373] text-sm leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section className="max-w-6xl mx-auto px-4 py-12 border-t border-[#262626]">
          <h2 className="text-center text-2xl font-bold text-[#e5e5e5] mb-8">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-[#1a1a0a] border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] font-bold text-sm mb-4">
                  {step.step}
                </div>
                <h3 className="text-[#e5e5e5] font-semibold mb-2">{step.title}</h3>
                <p className="text-[#737373] text-sm leading-relaxed">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 py-12 border-t border-[#262626]">
          <h2 className="text-center text-2xl font-bold text-[#e5e5e5] mb-8">Everything in one place</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-[#141414] border border-[#262626] rounded-xl p-5 flex gap-4 items-start">
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="text-[#e5e5e5] font-semibold mb-1">{f.title}</h3>
                  <p className="text-[#737373] text-sm leading-relaxed">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-r from-[#1a1a0a] to-[#141414] border border-[#f59e0b]/20 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#e5e5e5] mb-3">
              Know your number in 5 minutes
            </h2>
            <p className="text-[#737373] mb-6 max-w-lg mx-auto">
              Enter your salary, EMIs, and monthly spend. Get your Finance Health Score instantly — with a personalised action plan.
            </p>
            <Link
              href="/onboard"
              className="inline-block bg-[#f59e0b] text-black font-bold px-8 py-3.5 rounded-xl hover:bg-[#d97706] transition-all hover:scale-105"
            >
              Start — It&apos;s Free
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
